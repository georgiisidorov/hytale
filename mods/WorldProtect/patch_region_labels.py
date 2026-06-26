import argparse
import os
import shutil
import struct
import sys
import zipfile


DEFAULT_CLASS_NAME = "dev/worldprotect/worldprotect/map/RegionImageBuilder.class"
DEFAULT_TARGET_NAME = "drawRegionLabels"
DEFAULT_TARGET_DESC = "(Ljava/lang/String;Ljava/util/List;II)V"


def u1(data: bytearray, off: int) -> int:
    return data[off]


def u2(data: bytearray, off: int) -> int:
    return struct.unpack(">H", data[off : off + 2])[0]


def u4(data: bytearray, off: int) -> int:
    return struct.unpack(">I", data[off : off + 4])[0]


def p2(value: int) -> bytes:
    return struct.pack(">H", value)


def p4(value: int) -> bytes:
    return struct.pack(">I", value)


def parse_constant_pool(data: bytearray):
    pos = 8
    cp_count = u2(data, pos)
    pos += 2
    cp = [None]
    i = 1
    while i < cp_count:
        tag = u1(data, pos)
        pos += 1
        if tag == 1:
            length = u2(data, pos)
            pos += 2
            cp.append(data[pos : pos + length].decode("utf-8", "replace"))
            pos += length
        elif tag in (3, 4):
            cp.append(None)
            pos += 4
        elif tag in (5, 6):
            cp.extend([None, None])
            pos += 8
            i += 1
        elif tag in (7, 8, 16, 19, 20):
            cp.append(u2(data, pos))
            pos += 2
        elif tag in (9, 10, 11, 12, 17, 18):
            cp.append((u2(data, pos), u2(data, pos + 2)))
            pos += 4
        elif tag == 15:
            cp.append((u1(data, pos), u2(data, pos + 1)))
            pos += 3
        else:
            raise RuntimeError(f"Unsupported constant pool tag {tag} at index {i}")
        i += 1
    return cp, pos


def patch_method_code(
    data: bytearray,
    class_name: str,
    target_name: str,
    target_desc: str,
) -> bytearray:
    if data[:4] != b"\xca\xfe\xba\xbe":
        raise RuntimeError("Not a class file")

    cp, pos = parse_constant_pool(data)

    pos += 2  # access_flags
    pos += 2  # this_class
    pos += 2  # super_class

    interfaces_count = u2(data, pos)
    pos += 2 + interfaces_count * 2

    fields_count = u2(data, pos)
    pos += 2
    for _ in range(fields_count):
        pos += 6
        attr_count = u2(data, pos)
        pos += 2
        for _ in range(attr_count):
            pos += 2
            attr_len = u4(data, pos)
            pos += 4 + attr_len

    methods_count = u2(data, pos)
    pos += 2

    patched = False
    while methods_count > 0:
        methods_count -= 1
        pos += 2  # access_flags
        name_idx = u2(data, pos)
        pos += 2
        desc_idx = u2(data, pos)
        pos += 2
        attr_count = u2(data, pos)
        pos += 2

        method_name = cp[name_idx]
        method_desc = cp[desc_idx]

        for _ in range(attr_count):
            attr_name_idx = u2(data, pos)
            pos += 2
            attr_len_off = pos
            attr_len = u4(data, pos)
            pos += 4
            attr_data_off = pos
            attr_name = cp[attr_name_idx]

            if (
                method_name == target_name
                and method_desc == target_desc
                and attr_name == "Code"
            ):
                max_stack = u2(data, attr_data_off)
                max_locals = u2(data, attr_data_off + 2)
                new_code = b"\xb1"  # return
                new_info = b"".join(
                    [
                        p2(max_stack),
                        p2(max_locals),
                        p4(len(new_code)),
                        new_code,
                        p2(0),  # exception_table_length
                        p2(0),  # attributes_count
                    ]
                )
                replacement = p4(len(new_info)) + new_info
                data[attr_len_off : attr_data_off + attr_len] = replacement
                pos = attr_len_off + len(replacement)
                patched = True
            else:
                pos += attr_len

    if not patched:
        raise RuntimeError(
            f"Target method not found in {class_name}: {target_name}{target_desc}"
        )
    return data


def main():
    parser = argparse.ArgumentParser(
        description=(
            "Patch WorldProtect jar to disable drawing region labels on the world map "
            "(RegionImageBuilder.drawRegionLabels -> return)."
        )
    )
    parser.add_argument(
        "jar",
        help=(
            "Path to WorldProtect jar, e.g. /home/hytale/Server/mods/WorldProtect-1.0.11.jar"
        ),
    )
    parser.add_argument(
        "--class",
        dest="class_name",
        default=DEFAULT_CLASS_NAME,
        help=f"Target class file inside jar (default: {DEFAULT_CLASS_NAME})",
    )
    parser.add_argument(
        "--method",
        dest="method_name",
        default=DEFAULT_TARGET_NAME,
        help=f"Target method name (default: {DEFAULT_TARGET_NAME})",
    )
    parser.add_argument(
        "--desc",
        dest="method_desc",
        default=DEFAULT_TARGET_DESC,
        help=f"Target method descriptor (default: {DEFAULT_TARGET_DESC})",
    )
    parser.add_argument(
        "--backup-suffix",
        default=".bak-labels",
        help="Suffix for backup copy (default: .bak-labels)",
    )
    args = parser.parse_args()

    jar_path = os.path.abspath(args.jar)
    if not os.path.exists(jar_path):
        raise RuntimeError(f"Jar not found: {jar_path}")

    backup_path = jar_path + args.backup_suffix
    if not os.path.exists(backup_path):
        shutil.copy2(jar_path, backup_path)

    try:
        with zipfile.ZipFile(jar_path, "r") as zin:
            try:
                class_bytes = bytearray(zin.read(args.class_name))
            except KeyError as e:
                raise RuntimeError(
                    f"Class not found in jar: {args.class_name}"
                ) from e
    except zipfile.BadZipFile as e:
        raise RuntimeError(f"Not a valid zip/jar: {jar_path}") from e

    patched_class = patch_method_code(
        class_bytes,
        class_name=args.class_name,
        target_name=args.method_name,
        target_desc=args.method_desc,
    )
    temp_path = jar_path + ".tmp"

    with zipfile.ZipFile(jar_path, "r") as zin, zipfile.ZipFile(temp_path, "w") as zout:
        for item in zin.infolist():
            content = (
                patched_class if item.filename == args.class_name else zin.read(item.filename)
            )
            zout.writestr(item, content)

    os.replace(temp_path, jar_path)
    print(f"Patched: {args.class_name} :: {args.method_name}{args.method_desc} -> return")
    print("Backup:", backup_path)
    print("Jar:", jar_path)


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print("ERROR:", str(e), file=sys.stderr)
        sys.exit(1)
