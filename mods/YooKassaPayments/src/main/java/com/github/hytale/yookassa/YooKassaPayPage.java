package com.github.hytale.yookassa;

import com.hypixel.hytale.codec.Codec;
import com.hypixel.hytale.codec.KeyedCodec;
import com.hypixel.hytale.codec.builder.BuilderCodec;
import com.hypixel.hytale.component.Ref;
import com.hypixel.hytale.component.Store;
import com.hypixel.hytale.logger.HytaleLogger;
import com.hypixel.hytale.protocol.packets.interface_.CustomPageLifetime;
import com.hypixel.hytale.protocol.packets.interface_.CustomUIEventBindingType;
import com.hypixel.hytale.server.core.Message;
import com.hypixel.hytale.server.core.entity.entities.player.pages.InteractiveCustomUIPage;
import com.hypixel.hytale.server.core.ui.builder.EventData;
import com.hypixel.hytale.server.core.ui.builder.UICommandBuilder;
import com.hypixel.hytale.server.core.ui.builder.UIEventBuilder;
import com.hypixel.hytale.server.core.universe.PlayerRef;
import com.hypixel.hytale.server.core.universe.Universe;
import com.hypixel.hytale.server.core.universe.world.World;
import com.hypixel.hytale.server.core.universe.world.storage.EntityStore;
import com.hypixel.hytale.server.core.entity.entities.Player;
import com.hypixel.hytale.server.core.inventory.ItemStack;
import com.hypixel.hytale.server.core.plugin.PluginBase;
import com.hypixel.hytale.server.core.plugin.PluginManager;

import java.awt.Color;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.lang.reflect.Field;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executors;
import java.util.concurrent.ForkJoinPool;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import java.util.concurrent.atomic.AtomicInteger;

public final class YooKassaPayPage extends InteractiveCustomUIPage<YooKassaPayPage.PayEventData> {
    private static final String PAGE = "Pages/YooKassa/YooKassaPay.ui";

    // --- Монетные паки (рубли → монеты через YooKassa) ---
    private record KitPack(String id, String name, int priceRub, int diamonds) {}
    private static final KitPack[] COIN_KIT_PACKS = {
        new KitPack("coin_pack_rookie",  "Новичок",            149,  1500),
        new KitPack("coin_pack_starter", "Стартовый запас",    349,  4000),
        new KitPack("coin_pack_builder", "Большая стройка",    799,  10000),
        new KitPack("coin_pack_guild",   "Гильдейский сундук", 1990, 30000),
    };

    // --- Алмазные паки (рубли → алмазы через YooKassa) ---
    private static final KitPack[] KIT_PACKS = {
        new KitPack("diamond_pack_small_bag",    "Малый мешочек",    299,  330),
        new KitPack("diamond_pack_seeker_chest", "Сундук искателя",  699,  850),
        new KitPack("diamond_pack_royal_vein",   "Королевская жила", 1490, 2000),
        new KitPack("diamond_pack_dragon_hoard", "Драконий клад",    2990, 4500),
    };

    private static final long API_TIMEOUT_SEC = 40;
    private static final ScheduledExecutorService UI_SCHEDULER =
            Executors.newSingleThreadScheduledExecutor(r -> {
                Thread t = new Thread(r, "yookassa-ui-timer");
                t.setDaemon(true);
                return t;
            });

    private final YooKassaPaymentsPlugin plugin;
    private final World world;
    private final HytaleLogger log;
    private final YooKassaApi api = new YooKassaApi();

    private static final String ROULETTE_PLUGIN_CLASS = "com.roulette.Plugin";

    private static final int SHOP_GRID_SLOTS = 6;

    private static final String[] PRODUCT_CARD_IDS = {
            "#ProductCard1", "#ProductCard2", "#ProductCard3",
            "#ProductCard4", "#ProductCard5", "#ProductCard6",
    };

    private static final String SHOP_SLOT_EMPTY_BG = "#0a1525";
    private static final String SHOP_SLOT_FILLED_BG = "#10243f";
    /** Предметы с иконками — порядок должен совпадать с порядком панелей #PC{n}I{i} и #SDI{i} в .ui. */
    private static final String[] SHOP_ICON_IDS = {
            "Armor_Adamantite_Chest","Armor_Adamantite_Head","Armor_Adamantite_Legs",
            "Armor_Cobalt_Chest","Armor_Cobalt_Hands","Armor_Cobalt_Head","Armor_Cobalt_Legs",
            "Armor_Copper_Chest","Armor_Copper_Hands","Armor_Copper_Head","Armor_Copper_Legs",
            "Armor_Iron_Chest","Armor_Iron_Hands","Armor_Iron_Head","Armor_Iron_Legs",
            "Armor_Leather_Heavy_Chest","Armor_Leather_Heavy_Hands","Armor_Leather_Heavy_Head","Armor_Leather_Heavy_Legs",
            "Armor_Leather_Light_Chest","Armor_Leather_Light_Hands","Armor_Leather_Light_Head","Armor_Leather_Light_Legs",
            "Armor_Leather_Medium_Chest","Armor_Leather_Medium_Hands","Armor_Leather_Medium_Head","Armor_Leather_Medium_Legs",
            "Armor_Mithril_Chest","Armor_Mithril_Hands","Armor_Mithril_Head","Armor_Mithril_Legs",
            "Armor_Steel_Chest","Armor_Steel_Hands","Armor_Steel_Head","Armor_Steel_Legs",
            "Armor_Thorium_Chest","Armor_Thorium_Hands","Armor_Thorium_Head","Armor_Thorium_Legs",
            "Bench_Alchemy","Bench_WorkBench","Block_Glass",
            "Container_Bottle","Container_Water",
            "Deco_Lantern","Deco_Rope","Deco_Torch","Door_Wood_Oak",
            "Fluid_Lava","Fluid_Water",
            "Furniture_Crude_Torch","Furniture_Royal_Magic_Bed","Furniture_Royal_Magic_Carpet",
            "Furniture_Royal_Magic_Medium_Door","Furniture_Royal_Magic_Pot",
            "Furniture_Tavern_Barrel","Furniture_Village_Chest_Small","Furniture_Village_Crate","Furniture_Village_Door",
            "Ingredient_Catalyst","Ingredient_Essence_Life","Ingredient_Fertilizer","Ingredient_Fibre",
            "Ingredient_Fire_Essence","Ingredient_Ice_Essence","Ingredient_Life_Essence","Ingredient_Life_Essence_Tomato",
            "Ingredient_Stick","Ingredient_Tree_Sap","Leaf_Oak","Metal_Iron_Ornate",
            "Plant_Crop_Berry_Block","Plant_Crop_Health3","Plant_Crop_Mushroom_Block_Brown_Mycelium",
            "Plant_Crop_Mushroom_Common_Brown","Plant_Crop_Mushroom_Glowing_Blue",
            "Plant_Fiber","Plant_Flower","Plant_Flower_Common_Yellow2","Plant_Flower_Flax_Orange",
            "Plant_Fruit_Apple","Plant_Moss_Block_Green","Plant_Moss_Rug_Green","Plant_Petals_Red",
            "Plant_Sap","Plant_Sapling_Oak","Plant_Seed_Basic","Plant_Seed_Berry","Plant_Seed_Vegetable",
            "Plant_Seeds_Carrot","Plant_Seeds_Wheat",
            "Potion_Empty","Potion_Health","Potion_Stamina",
            "Rock_Ice_Permafrost","Rock_Stone","Rock_Stone_Brick","Rock_Stone_Cobble",
            "Soil_Clay","Soil_Clay_Brick","Soil_Dirt","Soil_Grass","Soil_Gravel",
            "Soil_Leaves","Soil_Moss","Soil_Sand","Soil_Snow",
            "Tool_Capture_Crate","Tool_Fertilizer","Tool_Hammer_Iron","Tool_Pickaxe_Iron","Tool_Repair_Kit_Rare",
            "Weapon_Arrow","Weapon_Arrow_Crude","Weapon_Arrow_Iron",
            "Weapon_Axe_Copper","Weapon_Axe_Iron",
            "Weapon_Longsword_Iron","Weapon_Longsword_Mithril",
            "Weapon_Shield_Oak","Weapon_Shield_Orbis_Incandescent",
            "Weapon_Shortbow_Doomed","Weapon_Staff_Crystal_Flame","Weapon_Staff_Wood",
            "Weapon_Sword_Adamantite","Weapon_Sword_Cobalt","Weapon_Sword_Copper","Weapon_Sword_Crude",
            "Weapon_Sword_Iron","Weapon_Sword_Mithril","Weapon_Sword_Steel","Weapon_Sword_Stone_Trork",
            "Weapon_Sword_Thorium","Weapon_Sword_Wood",
            "Wood_Blackwood_Fence","Wood_Blackwood_Planks","Wood_Blackwood_Roof","Wood_Blackwood_Stairs",
            "Wood_Oak_Trunk","Wood_Oak_Trunk_Full","Wood_Redwood_Trunk","Wood_Redwood_Trunk_Full",
            "Armor_Adamantite_Hands","Ingredient_Charcoal","Plant_Bush","Plant_Crop_Chilli_Item",
            "Plant_Reeds_Water","Plant_Sapling_Redwood","Plant_Vine_Jungle","Weapon_Shortbow_Iron",
    };
    private static final java.util.Map<String, Integer> ICON_INDEX;
    static {
        ICON_INDEX = new java.util.HashMap<>();
        for (int i = 0; i < SHOP_ICON_IDS.length; i++) ICON_INDEX.put(SHOP_ICON_IDS[i], i);
    }


    /** Префиксы item id — вкладки магазина (см. YooKassaPay.ui #ShopCategories). */
    private static final String[] SHOP_TAB_CATEGORIES = {
            "Build", "Wood", "Craft", "Alchemy", "Plant", "Weapon", "Armor",
    };
    private static final String[] SHOP_TAB_SELECTORS = {
            "#CatBuild", "#CatWood", "#CatCraft", "#CatAlchemy", "#CatPlant", "#CatWeapon", "#CatArmor",
    };

    private final int[] currentCardIconIdx = {-1, -1, -1, -1, -1, -1, -1}; // 1-indexed; -1 = нет иконки
    private int currentDetailIconIdx = -1;

    private volatile String currentPage = "shop";
    private volatile String shopUiCategory = "Build";
    private volatile int shopUiPage = 0;
    private volatile int pendingKitPackCoins = 0;
    private volatile int selectedProduct = 0;
    private volatile boolean saveForRepeat;
    private volatile String pendingPayUrl;
    private volatile String pendingPayMode;
    /** coins | crystals — что пополняем через ЮKassa. */
    private volatile String pendingTopupCurrency = "coins";
    private volatile BigDecimal pendingPayRubAmount;
    private volatile String watchingPaymentId;

    private static final int WHEEL_SEGMENTS = 12;
    private static final String[] WHEEL_HIGHLIGHT_IDS = {
            "#WheelHl0", "#WheelHl1", "#WheelHl2", "#WheelHl3", "#WheelHl4", "#WheelHl5",
            "#WheelHl6", "#WheelHl7", "#WheelHl8", "#WheelHl9", "#WheelHl10", "#WheelHl11",
    };
    private static final String[] WHEEL_REWARD_ICON_IDS = {
            "#WheelRewardIcon0", "#WheelRewardIcon1", "#WheelRewardIcon2", "#WheelRewardIcon3",
            "#WheelRewardIcon4", "#WheelRewardIcon5", "#WheelRewardIcon6", "#WheelRewardIcon7",
            "#WheelRewardIcon8", "#WheelRewardIcon9", "#WheelRewardIcon10", "#WheelRewardIcon11",
    };
    /** sectorIndex -> #WheelHlN panel. highlight01.png = sector 0 (top), highlight02.png = sector 1, etc. */
    private static final int[] WHEEL_HIGHLIGHT_PANEL = {0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11};

    private final AtomicInteger wheelSpinSeq = new AtomicInteger();
    private volatile ScheduledFuture<?> wheelSpinTask;
    private volatile ScheduledFuture<?> wheelTimerTask;
    private volatile int wheelCursor = 0;
    private volatile boolean wheelSpinAnimating;

    public YooKassaPayPage(PlayerRef playerRef, YooKassaPaymentsPlugin plugin, World world) {
        super(playerRef, CustomPageLifetime.CanDismiss, PayEventData.CODEC);
        this.plugin = plugin;
        this.world = world;
        this.log = plugin.getLogger();
    }

    @Override
    public void build(
            Ref<EntityStore> ref,
            UICommandBuilder commands,
            UIEventBuilder events,
            Store<EntityStore> store
    ) {
        commands.append(PAGE);
        showPage(commands, currentPage);
        // Restore wallet payment-wait state after page rebuild (WaitSection is hidden by default in .ui).
        if ("wallet".equals(currentPage) && watchingPaymentId != null) {
            commands.set("#FormSection.Visible", false);
            commands.set("#WaitSection.Visible", true);
            commands.set("#WaitTitle.Text", "Платёж " + watchingPaymentId);
            String payUrl = pendingPayUrl;
            if (payUrl != null) {
                commands.set("#OpenPayLinkButton.Text",
                        "sbp".equals(pendingPayMode) ? "Перейти к оплате (СБП)" : "Перейти к оплате");
                commands.set("#OpenPayLinkButton.Visible", true);
                commands.set("#WaitHint.Text",
                        "Нажмите зелёную кнопку — появится ссылка для оплаты.");
            } else {
                commands.set("#WaitHint.Text", "Ожидаем подтверждение от ЮKassa…");
            }
        }
        // Restart wheel countdown timer after page rebuild.
        if ("wheel".equals(currentPage)) {
            startWheelTimer();
        }
        // ShopPage is visible by default — populate text/layout without icons to keep packet small.
        // Icons are sent in a separate async update immediately after build.
        populateShopCatalog(commands, true);
        selectProductUi(commands, 0, true);
        // Send icon updates in a second async packet so build() stays under the set() limit.
        populateShopIconsAsync();

        // Header + navigation
        bindNav(events, "shop", "#TabShop");
        bindNav(events, "wheel", "#TabWheel");
        bindNav(events, "packs", "#TabPacks");
        bindNav(events, "minigames", "#TabMinigames");
        bindAction(events, "topup_coins", "#TopUpCoinsPlus");
        bindAction(events, "topup_crystals", "#TopUpCrystalsPlus");

        // Coin pack buy buttons (CoinKitCard1..4)
        for (int i = 0; i < COIN_KIT_PACKS.length; i++) {
            events.addEventBinding(CustomUIEventBindingType.Activating, "#CoinKitCardBuy" + (i + 1),
                    EventData.of("Action", "buy_coin_kit_pack").append("PackIdx", String.valueOf(i)));
        }

        // Diamond pack buy buttons (KitCard1..4)
        for (int i = 0; i < KIT_PACKS.length; i++) {
            events.addEventBinding(CustomUIEventBindingType.Activating, "#KitCardBuy" + (i + 1),
                    EventData.of("Action", "buy_kit_pack").append("PackIdx", String.valueOf(i)));
        }

        // Shop interactions
        bindBuy(events, "0", "#BuyItemButton1");
        bindBuy(events, "1", "#BuyItemButton2");
        bindBuy(events, "2", "#BuyItemButton3");
        bindBuy(events, "3", "#BuyItemButton4");
        bindBuy(events, "4", "#BuyItemButton5");
        bindBuy(events, "5", "#BuyItemButton6");
        bindAction(events, "confirm_purchase", "#ShopConfirmButton");
        bindAction(events, "shop_prev_page", "#ShopPrevPage");
        bindAction(events, "shop_next_page", "#ShopNextPage");
        for (int i = 0; i < SHOP_TAB_CATEGORIES.length; i++) {
            bindShopCategory(events, SHOP_TAB_CATEGORIES[i], SHOP_TAB_SELECTORS[i]);
        }

        // Wallet payments
        bindPay(events, "card", "#PayCardButton");
        bindPay(events, "sbp", "#PaySbpButton");
        bindPay(events, "repeat", "#PayRepeatButton");
        events.addEventBinding(
                CustomUIEventBindingType.ValueChanged,
                "#AmountField",
                EventData.of("Action", "amount_changed")
                        .append("@AmountField", "#AmountField.Value")
        );

        events.addEventBinding(
                CustomUIEventBindingType.Activating,
                "#SaveRememberButton",
                EventData.of("Action", "toggle_save")
        );
        events.addEventBinding(
                CustomUIEventBindingType.Activating,
                "#SaveForgetButton",
                EventData.of("Action", "toggle_save")
        );
        events.addEventBinding(
                CustomUIEventBindingType.Activating,
                "#CloseButton",
                EventData.of("Action", "close")
        );
        events.addEventBinding(
                CustomUIEventBindingType.Activating,
                "#OpenPayLinkButton",
                EventData.of("Action", "open_pay")
        );

        // Wheel
        bindAction(events, "wheel_spin_free", "#WheelSpinFreeButton");
        bindAction(events, "wheel_spin_paid", "#WheelSpinPaidButton");

        // Minigames
        bindAction(events, "minigames_go_parkour", "#MinigamesGoParkour");

        // Voucher
        bindNav(events, "voucher", "#TabVoucher");
        events.addEventBinding(
                CustomUIEventBindingType.Activating,
                "#VoucherApplyButton",
                EventData.of("Action", "voucher_apply")
                         .append("@VoucherCodeField", "#VoucherCodeField.Value")
        );

        // Fetch balances asynchronously to avoid blocking the game thread during build
        refreshBalancesAsync();
    }

    private void bindNav(UIEventBuilder events, String page, String selector) {
        events.addEventBinding(
                CustomUIEventBindingType.Activating,
                selector,
                EventData.of("Action", "nav").append("Page", page)
        );
    }

    private void bindAction(UIEventBuilder events, String action, String selector) {
        events.addEventBinding(
                CustomUIEventBindingType.Activating,
                selector,
                EventData.of("Action", action)
        );
    }

    private void bindBuy(UIEventBuilder events, String itemIndex, String selector) {
        events.addEventBinding(
                CustomUIEventBindingType.Activating,
                selector,
                EventData.of("Action", "buy_item").append("Item", itemIndex)
        );
    }

    private void bindShopCategory(UIEventBuilder events, String category, String selector) {
        events.addEventBinding(
                CustomUIEventBindingType.Activating,
                selector,
                EventData.of("Action", "shop_cat").append("Category", category)
        );
    }

    private MarketCatalog catalog() {
        return plugin.marketCatalog();
    }

    private MarketCatalog.ShopItem[] visibleShopProducts() {
        return catalog().shopForUi(shopUiCategory, shopUiPage);
    }

    private String[] wheelSectorItemIds() {
        return catalog().wheelSectorItemIds();
    }

    private void bindPay(UIEventBuilder events, String mode, String selector) {
        events.addEventBinding(
                CustomUIEventBindingType.Activating,
                selector,
                EventData.of("Action", "pay")
                        .append("Mode", mode)
                        .append("@AmountField", "#AmountField.Value")
        );
    }

    private void populateShopIconsAsync() {
        final int selIdx = selectedProduct;
        CompletableFuture.runAsync(() -> world.execute(() -> {
            UICommandBuilder b = new UICommandBuilder();
            MarketCatalog.ShopItem[] products = visibleShopProducts();
            for (int i = 0; i < SHOP_GRID_SLOTS; i++) {
                int card = i + 1;
                if (i < products.length) {
                    setProductCardIcon(b, card, products[i].itemId());
                } else {
                    clearProductCardIcons(b, card);
                }
            }
            int detailIdx = (selIdx >= 0 && selIdx < products.length) ? selIdx : 0;
            if (products.length > 0) {
                setShopDetailIcon(b, products[detailIdx].itemId());
            }
            sendUpdate(b, false);
        }), ForkJoinPool.commonPool());
    }

    private void navigate(String page) {
        currentPage = (page == null || page.isBlank()) ? "shop" : page;
        UICommandBuilder b = new UICommandBuilder();
        showPage(b, currentPage);
        if ("shop".equals(currentPage)) {
            // Catalog text/layout already set from build(); only icons need to be refreshed.
            // Send icons in a separate async packet so this navigate packet stays small.
            populateShopIconsAsync();
        }
        if ("wallet".equals(currentPage)) {
            showFormStep(b);
            refreshSavedHint(b);
            updateSaveToggle(b);
            applyWalletConversionPreview(b, null);
        }
        if ("wheel".equals(currentPage)) {
            Object roulette = findRoulettePlugin();
            if (roulette != null) {
                Object dataManager = reflectField(roulette, "dataManager");
                if (dataManager != null) {
                    refreshWheelSidebar(b, roulette, dataManager, playerRef.getUuid());
                }
                clearWheelRewardIcons(b);
                clearWheelRewardText(b);
            } else {
                b.set("#WheelFreeSpinLine.Text", "Wheel backend не найден.");
                b.set("#WheelResetTimer.Text", "");
                b.set("#WheelDropRatesBody.Text", "");
                b.set("#WheelPoolInfoCol1.Text", "");
                b.set("#WheelPoolInfoCol2.Text", "");
                b.set("#WheelPoolInfoHint.Text", "");
            }
            startWheelTimer();
        } else {
            stopWheelTimer();
        }
        if ("packs".equals(currentPage)) {
            refreshBalancesAsync();
        }
        sendUpdate(b, false);
    }

    private void openTopUp(String currency) {
        pendingTopupCurrency = "crystals".equalsIgnoreCase(currency) ? "crystals" : "coins";
        currentPage = "wallet";
        UICommandBuilder b = new UICommandBuilder();
        showPage(b, "wallet");
        showFormStep(b);
        refreshSavedHint(b);
        updateSaveToggle(b);
        b.set("#AmountField.Value", "");
        applyWalletConversionPreview(b, null);
        sendUpdate(b, false);
    }

    private void refreshBalances(UICommandBuilder b) {
        applyBalances(b, fetchBalances());
    }

    private void refreshBalancesAsync() {
        UUID uuid = playerRef.getUuid();
        CompletableFuture
                .supplyAsync(this::fetchBalances, ForkJoinPool.commonPool())
                .thenAccept(bal -> world.execute(() -> {
                    UICommandBuilder update = new UICommandBuilder();
                    applyBalances(update, bal);
                    sendUpdate(update, false);
                }));
    }

    private PlayerWalletClient.Balances fetchBalances() {
        YooKassaConfig cfg = plugin.config();
        return plugin.walletClient().fetch(
                playerRef.getUuid(),
                cfg.marketCatalogUrl,
                cfg.marketCatalogApiKey,
                log
        );
    }

    private void applyBalances(UICommandBuilder b, PlayerWalletClient.Balances bal) {
        if (bal == null) {
            return;
        }
        b.set("#CoinsBalance.Text", formatCoins(bal.coins()));
        b.set("#CrystalsBalance.Text", formatCrystals(bal.crystals()));
    }

    private static String formatCoins(long n) {
        return String.format("%,d монет", n).replace(',', ' ');
    }

    private static String formatCrystals(long n) {
        return String.format("%,d алмазов", n).replace(',', ' ');
    }

    private static String formatGameAmount(long n) {
        return String.format("%,d", n).replace(',', ' ');
    }

    private void onAmountChanged(PayEventData data) {
        String raw = data != null ? data.amount : null;
        String digits = extractAmountDigits(raw);
        String display = formatAmountFieldValue(digits);

        UICommandBuilder b = new UICommandBuilder();
        if (raw == null || !display.equals(raw.trim())) {
            b.set("#AmountField.Value", display);
        }
        applyWalletConversionPreview(b, digits.isEmpty() ? null : digits);
        sendUpdate(b, false);
    }

    private static String extractAmountDigits(String raw) {
        if (raw == null || raw.isBlank()) {
            return "";
        }
        String s = raw.trim().replace(',', '.');
        StringBuilder out = new StringBuilder();
        boolean dot = false;
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            if (c >= '0' && c <= '9') {
                out.append(c);
            } else if (c == '.' && !dot) {
                out.append(c);
                dot = true;
            }
        }
        return out.toString();
    }

    private static String formatAmountFieldValue(String digits) {
        if (digits == null || digits.isEmpty()) {
            return "";
        }
        return digits + " руб";
    }

    private void applyWalletConversionPreview(UICommandBuilder b, String amountRaw) {
        YooKassaConfig cfg = plugin.config();
        boolean crystals = "crystals".equals(pendingTopupCurrency);
        String unit = crystals ? "алмазов" : "монет";
        int perRub = crystals ? cfg.crystalsPerRub : cfg.coinsPerRub;
        String unitShort = crystals ? "алм." : "монет";

        b.set(
                "#Hint.Text",
                crystals
                        ? "Пополнение алмазов. Введите сумму в рублях — справа покажем, сколько алмазов зачислится."
                        : "Пополнение монет. Введите сумму в рублях — справа покажем, сколько монет зачислится."
        );
        b.set("#WalletRateLine.Text", "Курс: " + perRub + " " + unitShort + " за 1 руб.");
        b.set("#WalletConvertPreviewCoins.Visible", !crystals);
        b.set("#WalletConvertPreviewCrystals.Visible", crystals);

        BigDecimal rub = parseAmountSilent(amountRaw);
        long game = previewGameAmount(rub, crystals, cfg);
        String preview;
        if (game > 0) {
            preview = "Вы получите: " + formatGameAmount(game) + " " + unit;
        } else {
            preview = "Введите сумму в рублях";
        }
        b.set("#WalletConvertPreviewCoins.Text", preview);
        b.set("#WalletConvertPreviewCrystals.Text", preview);
    }

    private static long previewGameAmount(BigDecimal rub, boolean crystals, YooKassaConfig cfg) {
        if (rub == null || rub.compareTo(BigDecimal.ZERO) <= 0) {
            return 0;
        }
        BigDecimal rate = BigDecimal.valueOf(crystals ? cfg.crystalsPerRub : cfg.coinsPerRub);
        long raw = rub.multiply(rate).setScale(0, RoundingMode.FLOOR).longValue();
        return Math.max(1, raw);
    }

    private static BigDecimal parseAmountSilent(String raw) {
        String s = extractAmountDigits(raw);
        if (s.isEmpty()) {
            return null;
        }
        try {
            BigDecimal amount = new BigDecimal(s);
            return amount.compareTo(BigDecimal.ZERO) > 0 ? amount : null;
        } catch (Exception e) {
            return null;
        }
    }

    private void selectProduct(String itemIndexRaw) {
        int index;
        try {
            index = Integer.parseInt(itemIndexRaw == null ? "" : itemIndexRaw.trim());
        } catch (NumberFormatException e) {
            flash("Неизвестный товар.");
            return;
        }
        MarketCatalog.ShopItem[] products = visibleShopProducts();
        if (index < 0 || index >= products.length) {
            flash("Неизвестный товар.");
            return;
        }
        selectedProduct = index;
        UICommandBuilder b = new UICommandBuilder();
        selectProductUi(b, index);
        sendUpdate(b, false);
    }

    private void setProductCardIcon(UICommandBuilder b, int card, String itemId) {
        int prev = currentCardIconIdx[card];
        if (prev >= 0) b.set("#PC" + card + "I" + prev + ".Visible", false);
        Integer idx = itemId != null ? ICON_INDEX.get(itemId) : null;
        if (idx != null) {
            b.set("#PC" + card + "I" + idx + ".Visible", true);
            currentCardIconIdx[card] = idx;
        } else {
            currentCardIconIdx[card] = -1;
        }
    }

    private void clearProductCardIcons(UICommandBuilder b, int card) {
        int prev = currentCardIconIdx[card];
        if (prev >= 0) {
            b.set("#PC" + card + "I" + prev + ".Visible", false);
            currentCardIconIdx[card] = -1;
        }
    }

    private void populateShopCatalog(UICommandBuilder b) {
        populateShopCatalog(b, false);
    }

    private void populateShopCatalog(UICommandBuilder b, boolean skipIcons) {
        MarketCatalog.ShopItem[] products = visibleShopProducts();
        for (int i = 0; i < SHOP_GRID_SLOTS; i++) {
            int card = i + 1;
            if (i < products.length) {
                MarketCatalog.ShopItem product = products[i];
                b.set("#ProductCard" + card + "Name.Text", product.cardTitle());
                b.set("#ProductCard" + card + "Price.Text", product.priceLabel());
                b.set("#ProductCard" + card + ".Visible", true);
                b.set("#ProductCard" + card + ".Background", SHOP_SLOT_FILLED_BG);
                b.set("#BuyItemButton" + card + ".Visible", true);
                if (!skipIcons) setProductCardIcon(b, card, product.itemId());
            } else {
                setEmptyShopSlot(b, card, skipIcons);
            }
        }
        int totalPages = catalog().shopPageCount(shopUiCategory);
        b.set("#ShopPageLabel.Text", (shopUiPage + 1) + " / " + totalPages);
        b.set("#ShopPrevPage.Visible", shopUiPage > 0);
        b.set("#ShopNextPage.Visible", shopUiPage < totalPages - 1);
    }

    private void setEmptyShopSlot(UICommandBuilder b, int card) {
        setEmptyShopSlot(b, card, false);
    }

    private void setEmptyShopSlot(UICommandBuilder b, int card, boolean skipIcons) {
        b.set("#ProductCard" + card + "Name.Text", "");
        b.set("#ProductCard" + card + "Price.Text", "");
        b.set("#ProductCard" + card + ".Visible", true);
        b.set("#ProductCard" + card + ".Background", SHOP_SLOT_EMPTY_BG);
        b.set("#BuyItemButton" + card + ".Visible", false);
        if (!skipIcons) clearProductCardIcons(b, card);
    }

    private void selectProductUi(UICommandBuilder b, int index) {
        selectProductUi(b, index, false);
    }

    private void selectProductUi(UICommandBuilder b, int index, boolean skipIcons) {
        MarketCatalog.ShopItem[] products = visibleShopProducts();
        if (index < 0 || index >= products.length) {
            return;
        }
        MarketCatalog.ShopItem product = products[index];
        b.set("#ShopDetailTitle.Text", product.detailTitle());
        b.set("#ShopDetailRarity.Text", product.rarityLabel());
        String desc = product.detailDescription();
        b.set("#ShopDetailDescScroll.Visible", !desc.isEmpty());
        b.set("#ShopDetailDesc.Text", desc);
        b.set("#ShopDetailStat1.Text", product.stat1());
        b.set("#ShopDetailStat2.Text", product.stat2());
        b.set("#ShopDetailStat3.Text", product.stat3());
        b.set("#ShopDetailPrice.Text", product.priceLabel());
        if (!skipIcons) setShopDetailIcon(b, product.itemId());
        highlightProductCards(b, index);
    }

    private void setShopDetailIcon(UICommandBuilder b, String itemId) {
        if (currentDetailIconIdx >= 0) {
            b.set("#SDI" + currentDetailIconIdx + ".Visible", false);
            currentDetailIconIdx = -1;
        }
        Integer idx = itemId != null ? ICON_INDEX.get(itemId) : null;
        if (idx != null) {
            b.set("#SDI" + idx + ".Visible", true);
            currentDetailIconIdx = idx;
        }
    }

    private void highlightProductCards(UICommandBuilder b, int activeIndex) {
        String selected = "#1a3558";
        MarketCatalog.ShopItem[] products = visibleShopProducts();
        for (int i = 0; i < PRODUCT_CARD_IDS.length; i++) {
            if (i >= products.length) {
                b.set(PRODUCT_CARD_IDS[i] + ".Background", SHOP_SLOT_EMPTY_BG);
            } else {
                boolean on = i == activeIndex;
                b.set(PRODUCT_CARD_IDS[i] + ".Background", on ? selected : SHOP_SLOT_FILLED_BG);
            }
        }
    }

    private void confirmPurchase(Ref<EntityStore> ref, Store<EntityStore> store) {
        MarketCatalog.ShopItem[] products = visibleShopProducts();
        if (selectedProduct < 0 || selectedProduct >= products.length) {
            flash("Выберите товар.");
            return;
        }
        MarketCatalog.ShopItem product = products[selectedProduct];
        if (!PlayerInventoryUtil.canFit(ref, store, product.itemId(), product.quantity())) {
            flash(PlayerInventoryUtil.INVENTORY_FULL_MESSAGE);
            return;
        }
        int price = product.price();
        if (price <= 0) {
            giveShopItem(ref, store, product);
            return;
        }

        String currency = product.useCrystals() ? "crystals" : "coins";
        YooKassaConfig cfg = plugin.config();
        UUID uuid = playerRef.getUuid();
        flash("Списание…");
        CompletableFuture
                .supplyAsync(
                        () -> plugin.walletClient().debit(
                                uuid,
                                currency,
                                price,
                                "shop:" + product.itemId(),
                                cfg.marketCatalogUrl,
                                cfg.marketCatalogApiKey,
                                log
                        ),
                        ForkJoinPool.commonPool()
                )
                .thenAccept(result -> world.execute(() -> {
                    if (!result.ok()) {
                        flash(result.error() != null && !result.error().isBlank()
                                ? result.error()
                                : "Недостаточно средств.");
                        UICommandBuilder b = new UICommandBuilder();
                        if (result.balances() != null) {
                            applyBalances(b, result.balances());
                        }
                        sendUpdate(b, false);
                        return;
                    }
                    giveShopItem(ref, store, product);
                    UICommandBuilder b = new UICommandBuilder();
                    applyBalances(b, result.balances());
                    sendUpdate(b, false);
                }));
    }

    private void giveShopItem(Ref<EntityStore> ref, Store<EntityStore> store, MarketCatalog.ShopItem product) {
        try {
            ItemStack stack = new ItemStack(product.itemId(), Math.max(1, product.quantity()));
            Player.giveItem(stack, ref, store);
            flash("Куплено: " + product.cardTitle());
        } catch (Throwable t) {
            log.atWarning().withCause(t).log("[Shop] give item failed: %s", product.itemId());
            flash("Не удалось выдать предмет.");
        }
    }


    private void showPage(UICommandBuilder b, String page) {
        setPageVisible(b, "shop".equals(page), "#ShopPage", "#TabShop");
        b.set("#WalletPage.Visible", "wallet".equals(page));
        setPageVisible(b, "wheel".equals(page), "#WheelPage", "#TabWheel");
        setPageVisible(b, "packs".equals(page), "#PacksPage", "#TabPacks");
        setPageVisible(b, "minigames".equals(page), "#MinigamesPage", "#TabMinigames");
        setPageVisible(b, "voucher".equals(page), "#VoucherPage", "#TabVoucher");
    }

    private void setPageVisible(UICommandBuilder b, boolean visible, String pageSelector, String tabSelector) {
        b.set(pageSelector + ".Visible", visible);
        b.set(tabSelector + ".Background", visible ? "#243855" : "#172a46");
    }

    private void ensureWalletVisible(UICommandBuilder b) {
        if (!"wallet".equals(currentPage)) {
            currentPage = "wallet";
            showPage(b, "wallet");
        }
    }

    private void showFormStep(UICommandBuilder b) {
        ensureWalletVisible(b);
        b.set("#FormSection.Visible", true);
        b.set("#WaitSection.Visible", false);
        hidePayLink(b);
        applyWalletConversionPreview(b, null);
    }

    private void showWaitStep(UICommandBuilder b) {
        b.set("#FormSection.Visible", false);
        b.set("#WaitSection.Visible", true);
        hidePayLink(b);
    }

    private void hidePayLink(UICommandBuilder b) {
        b.set("#OpenPayLinkButton.Visible", false);
        pendingPayUrl = null;
        pendingPayMode = null;
    }

    private void showPayLink(UICommandBuilder b, String url, String mode) {
        if (url == null || url.isBlank()) {
            hidePayLink(b);
            return;
        }
        pendingPayUrl = url;
        pendingPayMode = mode;
        b.set(
                "#OpenPayLinkButton.Text",
                "sbp".equals(mode) ? "Перейти к оплате (СБП)" : "Перейти к оплате"
        );
        b.set("#OpenPayLinkButton.Visible", true);
    }

    private void openPendingPayUrl() {
        String url = pendingPayUrl;
        if (url == null || url.isBlank()) {
            flash("Ссылка на оплату ещё не готова.");
            return;
        }
        try {
            playerRef.sendMessage(Message.raw("__________________________________________________"));
            playerRef.sendMessage(Message.raw(url).link(url).color(java.awt.Color.GREEN));
            playerRef.sendMessage(Message.raw("__________________________________________________"));
        } catch (Throwable t) {
            log.atWarning().withCause(t).log("[YooKassa] send pay link to chat failed");
        }
        UICommandBuilder b = new UICommandBuilder();
        b.set("#WaitHint.Text", "Нажмите зелёную ссылку в чате — откроется страница оплаты.");
        sendUpdate(b, false);
    }

    private void refreshSavedHint(UICommandBuilder b) {
        UUID uuid = playerRef.getUuid();
        String title = plugin.savedMethods().getTitle(uuid);
        String pmId = plugin.savedMethods().getPaymentMethodId(uuid);
        if (pmId != null && !pmId.isBlank()) {
            String shown = (title != null && !title.isBlank())
                    ? title
                    : "…" + pmId.substring(Math.max(0, pmId.length() - 6));
            b.set("#SavedHint.Text", "Сохранённый способ: " + shown);
        } else {
            b.set(
                    "#SavedHint.Text",
                    "Повторный платёж: сначала оплатите с «Запомнить способ» (карта или СБП)."
            );
        }
    }

    private void updateSaveToggle(UICommandBuilder b) {
        b.set("#SaveRememberButton.Visible", saveForRepeat);
        b.set("#SaveForgetButton.Visible", !saveForRepeat);
    }

    @Override
    public void handleDataEvent(Ref<EntityStore> ref, Store<EntityStore> store, PayEventData data) {
        if (data == null || data.action == null) {
            return;
        }
        switch (data.action) {
            case "close" -> {
                stopPolling();
                stopWheelTimer();
                stopWheelAnimation();
                pendingKitPackCoins = 0;
                close();
            }
            case "toggle_save" -> {
                saveForRepeat = !saveForRepeat;
                UICommandBuilder b = new UICommandBuilder();
                updateSaveToggle(b);
                sendUpdate(b, false);
            }
            case "nav" -> navigate(data.page);
            case "topup_coins" -> openTopUp("coins");
            case "topup_crystals" -> openTopUp("crystals");
            case "wheel_spin_free" -> onWheelSpin(ref, store, false);
            case "wheel_spin_paid" -> onWheelSpin(ref, store, true);
            case "buy_coin_kit_pack" -> buyCoinKitPack(data.packIdx);
            case "buy_kit_pack" -> buyKitPack(data.packIdx);
            case "shop_cat" -> selectShopCategory(data.category);
            case "shop_prev_page" -> navigateShopPage(-1);
            case "shop_next_page" -> navigateShopPage(1);
            case "buy_item" -> selectProduct(data.item);
            case "confirm_purchase" -> confirmPurchase(ref, store);
            case "pay" -> onPay(data);
            case "open_pay" -> openPendingPayUrl();
            case "amount_changed" -> onAmountChanged(data);
            case "minigames_go_parkour" -> goToParkour();
            case "voucher_apply" -> applyVoucher(ref, store, data.voucherCode);
            default -> {
            }
        }
    }

    private void applyVoucher(Ref<EntityStore> ref, Store<EntityStore> store, String rawCode) {
        String code = rawCode == null ? "" : rawCode.trim().toUpperCase();
        UICommandBuilder bInit = new UICommandBuilder();
        bInit.set("#VoucherStatusOk.Visible", false);
        bInit.set("#VoucherStatusErr.Visible", false);
        if (code.isEmpty()) {
            bInit.set("#VoucherStatusErr.Text", "Введите код ваучера.");
            bInit.set("#VoucherStatusErr.Visible", true);
            sendUpdate(bInit, false);
            return;
        }
        bInit.set("#VoucherApplyButton.Visible", false);
        sendUpdate(bInit, false);

        YooKassaConfig cfg = plugin.config();
        UUID uuid = playerRef.getUuid();

        CompletableFuture
                .supplyAsync(
                        () -> plugin.walletClient().claimPackVoucher(code, uuid, cfg.marketCatalogUrl, cfg.marketCatalogApiKey, log),
                        ForkJoinPool.commonPool()
                )
                .orTimeout(API_TIMEOUT_SEC, TimeUnit.SECONDS)
                .whenComplete((result, ex) -> world.execute(() -> {
                    UICommandBuilder b = new UICommandBuilder();
                    b.set("#VoucherApplyButton.Visible", true);
                    if (ex != null || result == null || !result.ok()) {
                        String err = (result != null && result.error() != null && !result.error().isEmpty())
                                ? result.error() : "Ошибка соединения. Попробуйте позже.";
                        b.set("#VoucherStatusErr.Text", err);
                        b.set("#VoucherStatusErr.Visible", true);
                        b.set("#VoucherStatusOk.Visible", false);
                    } else {
                        int given = 0;
                        for (PlayerWalletClient.PackItem item : result.items()) {
                            try {
                                Player.giveItem(new ItemStack(item.itemId(), Math.max(1, item.quantity())), ref, store);
                                given++;
                            } catch (Throwable t) {
                                log.atWarning().withCause(t).log("[Voucher] give item failed: %s", item.itemId());
                            }
                        }
                        b.set("#VoucherCodeField.Value", "");
                        b.set("#VoucherStatusOk.Text", "Ваучер «" + result.packName() + "» активирован! Предметов выдано: " + given + ".");
                        b.set("#VoucherStatusOk.Visible", true);
                        b.set("#VoucherStatusErr.Visible", false);
                        log.atInfo().log("[Voucher] claimed pack=%s player=%s given=%d", result.packName(), uuid, given);
                    }
                    sendUpdate(b, false);
                }));
    }

    private void goToParkour() {
        try {
            Universe universe = Universe.get();
            if (universe == null) {
                log.atWarning().log("goToParkour: Universe not ready");
                return;
            }
            World mazeWorld = universe.getWorld("maze");
            if (mazeWorld == null) {
                log.atWarning().log("goToParkour: world 'maze' not found");
                return;
            }
            World lobbyWorld = universe.getWorld("lobby");
            if (lobbyWorld != null) {
                lobbyWorld.drainPlayersTo(mazeWorld, java.util.Collections.singletonList(playerRef));
            } else {
                mazeWorld.addPlayer(playerRef);
            }
        } catch (Throwable e) {
            log.atWarning().log("goToParkour failed: " + e.getMessage());
        }
    }

    private void buyCoinKitPack(String packIdxRaw) {
        int idx;
        try {
            idx = Integer.parseInt(packIdxRaw == null ? "" : packIdxRaw.trim());
        } catch (NumberFormatException e) {
            flash("Неизвестный пак.");
            return;
        }
        if (idx < 0 || idx >= COIN_KIT_PACKS.length) {
            flash("Неизвестный пак.");
            return;
        }
        KitPack pack = COIN_KIT_PACKS[idx];
        if (!plugin.config().isValid()) {
            flash("ЮKassa не настроен (нет shop_id / secret_key).");
            return;
        }

        pendingKitPackCoins = pack.diamonds();
        pendingTopupCurrency = "coins";
        pendingPayRubAmount = BigDecimal.valueOf(pack.priceRub());
        currentPage = "wallet";

        UICommandBuilder b = new UICommandBuilder();
        showPage(b, "wallet");
        showWaitStep(b);
        b.set("#WaitTitle.Text", "Создаём платёж…");
        b.set("#WaitHint.Text", pack.name() + ": " + pack.priceRub() + " руб. → " + formatGameAmount(pack.diamonds()) + " монет");
        sendUpdate(b, false);

        YooKassaConfig cfg = plugin.config();
        UUID uuid = playerRef.getUuid();
        String playerName = playerRef.getUsername();
        BigDecimal amount = BigDecimal.valueOf(pack.priceRub());
        Map<String, String> meta = new HashMap<>();
        meta.put("player_uuid", uuid.toString());
        meta.put("player_name", playerName != null ? playerName : "");
        meta.put("pay_mode", "card");
        meta.put("credit_currency", "coins");
        meta.put("kit_pack_id", pack.id());
        meta.put("kit_pack_diamonds", String.valueOf(pack.diamonds()));
        String returnUrl = cfg.returnUrl.isBlank() ? "https://yookassa.ru/" : cfg.returnUrl;
        String desc = "Пак монет «" + pack.name() + "» для " + (playerName != null ? playerName : uuid);
        log.atInfo().log("[Packs] coin pack player=%s pack=%s priceRub=%d coins=%d", playerName, pack.id(), pack.priceRub(), pack.diamonds());

        CompletableFuture
                .supplyAsync(() -> {
                    try {
                        UUID idem = UUID.randomUUID();
                        return api.createRedirectPayment(
                                cfg.shopId, cfg.secretKey, amount, desc, returnUrl, meta, false, idem, log
                        );
                    } catch (Exception e) {
                        return YooKassaApi.PaymentResult.error(-1, e.getClass().getSimpleName(),
                                e.getMessage() != null ? e.getMessage() : String.valueOf(e));
                    }
                }, ForkJoinPool.commonPool())
                .orTimeout(API_TIMEOUT_SEC, TimeUnit.SECONDS)
                .whenComplete((r, ex) -> world.execute(() -> finishCreate(r, ex, "card", uuid, playerName)));
    }

    private void buyKitPack(String packIdxRaw) {
        int idx;
        try {
            idx = Integer.parseInt(packIdxRaw == null ? "" : packIdxRaw.trim());
        } catch (NumberFormatException e) {
            flash("Неизвестный пак.");
            return;
        }
        if (idx < 0 || idx >= KIT_PACKS.length) {
            flash("Неизвестный пак.");
            return;
        }
        KitPack pack = KIT_PACKS[idx];
        if (!plugin.config().isValid()) {
            flash("ЮKassa не настроен (нет shop_id / secret_key).");
            return;
        }

        pendingKitPackCoins = pack.diamonds();
        pendingTopupCurrency = "crystals";
        pendingPayRubAmount = BigDecimal.valueOf(pack.priceRub());
        currentPage = "wallet";

        UICommandBuilder b = new UICommandBuilder();
        showPage(b, "wallet");
        showWaitStep(b);
        b.set("#WaitTitle.Text", "Создаём платёж…");
        b.set("#WaitHint.Text", pack.name() + ": " + pack.priceRub() + " руб. → " + formatGameAmount(pack.diamonds()) + " алмазов");
        sendUpdate(b, false);

        YooKassaConfig cfg = plugin.config();
        UUID uuid = playerRef.getUuid();
        String playerName = playerRef.getUsername();
        BigDecimal amount = BigDecimal.valueOf(pack.priceRub());
        Map<String, String> meta = new HashMap<>();
        meta.put("player_uuid", uuid.toString());
        meta.put("player_name", playerName != null ? playerName : "");
        meta.put("pay_mode", "card");
        meta.put("credit_currency", "crystals");
        meta.put("kit_pack_id", pack.id());
        meta.put("kit_pack_diamonds", String.valueOf(pack.diamonds()));
        String returnUrl = cfg.returnUrl.isBlank() ? "https://yookassa.ru/" : cfg.returnUrl;
        String desc = "Кит-пак «" + pack.name() + "» для " + (playerName != null ? playerName : uuid);
        log.atInfo().log("[Packs] diamond pack player=%s pack=%s priceRub=%d diamonds=%d", playerName, pack.id(), pack.priceRub(), pack.diamonds());

        CompletableFuture
                .supplyAsync(() -> {
                    try {
                        UUID idem = UUID.randomUUID();
                        return api.createRedirectPayment(
                                cfg.shopId, cfg.secretKey, amount, desc, returnUrl, meta, false, idem, log
                        );
                    } catch (Exception e) {
                        return YooKassaApi.PaymentResult.error(-1, e.getClass().getSimpleName(),
                                e.getMessage() != null ? e.getMessage() : String.valueOf(e));
                    }
                }, ForkJoinPool.commonPool())
                .orTimeout(API_TIMEOUT_SEC, TimeUnit.SECONDS)
                .whenComplete((r, ex) -> world.execute(() -> finishCreate(r, ex, "card", uuid, playerName)));
    }

    private void selectShopCategory(String categoryRaw) {
        String cat = categoryRaw == null ? "Build" : categoryRaw.trim();
        if (cat.isEmpty()) cat = "Build";
        shopUiCategory = cat;
        shopUiPage = 0;
        selectedProduct = 0;
        UICommandBuilder b = new UICommandBuilder();
        for (int i = 0; i < SHOP_TAB_CATEGORIES.length; i++) {
            boolean active = SHOP_TAB_CATEGORIES[i].equals(cat);
            b.set(SHOP_TAB_SELECTORS[i] + ".Visible", !active);
            b.set(SHOP_TAB_SELECTORS[i] + "Active.Visible", active);
        }
        populateShopCatalog(b, false);
        selectProductUi(b, 0, false);
        sendUpdate(b, false);
    }

    private void navigateShopPage(int delta) {
        int pages = catalog().shopPageCount(shopUiCategory);
        shopUiPage = Math.max(0, Math.min(pages - 1, shopUiPage + delta));
        selectedProduct = 0;
        UICommandBuilder b = new UICommandBuilder();
        populateShopCatalog(b, false);
        selectProductUi(b, 0, false);
        sendUpdate(b, false);
    }

    private void onWheelSpin(Ref<EntityStore> ref, Store<EntityStore> store, boolean paidSpin) {
        if (wheelSpinAnimating) {
            flash("Подождите, колесо крутится…");
            return;
        }

        MarketCatalog.SpinResult picked = catalog().pickWheelReward();
        if (("item".equals(picked.rewardType()) || "pack".equals(picked.rewardType()))
                && picked.itemId() != null
                && !PlayerInventoryUtil.canFit(ref, store, picked.itemId(), picked.quantity())) {
            flash(PlayerInventoryUtil.INVENTORY_FULL_MESSAGE);
            return;
        }

        if (paidSpin) {
            int cost = plugin.config().wheelSpinCrystalCost;
            YooKassaConfig cfg = plugin.config();
            UUID uuid = playerRef.getUuid();
            flash("Списание алмазов…");
            CompletableFuture
                    .supplyAsync(
                            () -> plugin.walletClient().debit(
                                    uuid,
                                    "crystals",
                                    cost,
                                    "wheel_spin",
                                    cfg.marketCatalogUrl,
                                    cfg.marketCatalogApiKey,
                                    log
                            ),
                            ForkJoinPool.commonPool()
                    )
                    .thenAccept(debit -> world.execute(() -> {
                        if (!debit.ok()) {
                            flash(debit.error() != null && !debit.error().isBlank()
                                    ? debit.error()
                                    : "Недостаточно алмазов.");
                            UICommandBuilder b = new UICommandBuilder();
                            if (debit.balances() != null) {
                                applyBalances(b, debit.balances());
                            }
                            sendUpdate(b, false);
                            return;
                        }
                        UICommandBuilder b = new UICommandBuilder();
                        applyBalances(b, debit.balances());
                        sendUpdate(b, false);
                        runWheelSpin(ref, store, false, picked);
                    }));
            return;
        }

        runWheelSpin(ref, store, true, picked);
    }

    private void runWheelSpin(
            Ref<EntityStore> ref,
            Store<EntityStore> store,
            boolean freeSpin,
            MarketCatalog.SpinResult picked
    ) {
        try {
            Object roulette = findRoulettePlugin();
            if (roulette == null) {
                flash("Wheel backend не найден (roulette-atomic).");
                return;
            }
            Object dataManager = reflectField(roulette, "dataManager");
            if (dataManager == null) {
                flash("Wheel backend не готов.");
                return;
            }

            UUID uuid = playerRef.getUuid();
            if (freeSpin) {
                Object playerData = dataManager.getClass().getMethod("getPlayerData", UUID.class).invoke(dataManager, uuid);
                boolean canSpin = (boolean) playerData.getClass().getMethod("canSpin").invoke(playerData);
                if (!canSpin) {
                    flash("Бесплатный спин ещё недоступен.");
                    return;
                }
            }

            int target = picked.slotIndex();
            startWheelAnimation(
                    target,
                    () -> {
                        CompletableFuture.runAsync(() -> {
                            try {
                                giveWheelReward(ref, store, picked, uuid, freeSpin, dataManager);
                            } catch (Throwable t) {
                                log.atWarning().withCause(t).log("[Wheel] give reward failed type=%s item=%s", picked.rewardType(), picked.itemId());
                                flash("Не удалось выдать награду.");
                            }
                        }, world);

                        wheelSpinAnimating = false;
                        UICommandBuilder b = new UICommandBuilder();
                        setWheelRewardDetails(b, picked);
                        setWheelRewardIcon(b, picked);
                        String rewardLabel = wheelRewardDisplayName(picked);
                        b.set("#WheelLastReward.Text", "Последняя награда: " + rewardLabel);
                        b.set("#WheelAnimHint.Text", "");
                        refreshWheelSidebar(b, roulette, dataManager, uuid);
                        sendUpdate(b, false);
                    }
            );
        } catch (Throwable t) {
            log.atWarning().withCause(t).log("[Wheel] spin failed");
            wheelSpinAnimating = false;
            flash("Wheel: ошибка спина.");
        }
    }

    private void applyWheelSpinButtonsLocked(UICommandBuilder b) {
        b.set("#WheelSpinFreeButton.Visible", false);
        b.set("#WheelSpinPaidButton.Visible", false);
        b.set("#WheelAnimHint.Text", "Идёт спин…");
    }

    private void giveWheelReward(
            Ref<EntityStore> ref,
            Store<EntityStore> store,
            MarketCatalog.SpinResult picked,
            UUID uuid,
            boolean freeSpin,
            Object dataManager
    ) throws Exception {
        // First update the free-spin timer so it's consumed before we give the reward.
        if (freeSpin) {
            dataManager.getClass().getMethod("updateSpinTime", UUID.class).invoke(dataManager, uuid);
            dataManager.getClass().getMethod("saveData").invoke(dataManager);
        }
        String type = picked.rewardType();
        switch (type) {
            case "item", "pack" -> {
                if (picked.itemId() != null) {
                    ItemStack stack = new ItemStack(picked.itemId(), Math.max(1, picked.quantity()));
                    Player.giveItem(stack, ref, store);
                }
            }
            case "coins" -> {
                YooKassaConfig cfg = plugin.config();
                plugin.walletClient().creditWheelCoins(uuid, picked.quantity(), cfg.marketCatalogUrl, cfg.marketCatalogApiKey, log);
                refreshBalancesAsync();
            }
            case "free_spin" -> {
                // Reset spin timer so player can spin again.
                Object playerData = dataManager.getClass().getMethod("getPlayerData", UUID.class).invoke(dataManager, uuid);
                playerData.getClass().getMethod("setLastSpinTime", long.class).invoke(playerData, 0L);
                dataManager.getClass().getMethod("saveData").invoke(dataManager);
            }
            // "empty" → nothing to give
        }
        String rewardLabel = wheelRewardDisplayName(picked);
        if ("empty".equals(type)) {
            flash("Увы, пустой сектор!");
        } else {
            flash("Получено: " + rewardLabel);
        }
    }

    private void applyWheelSpinButtonVisibility(UICommandBuilder b, boolean canSpin, int cost) {
        if (wheelSpinAnimating) {
            applyWheelSpinButtonsLocked(b);
            return;
        }
        b.set("#WheelSpinFreeButton.Visible", canSpin);
        b.set("#WheelSpinPaidButton.Visible", !canSpin);
        b.set("#WheelSpinPaidButton.Text", "Крутить — " + cost + " алмазов");
    }

    private void startWheelAnimation(int targetIndex, Runnable onFinish) {
        if (wheelSpinAnimating) {
            return;
        }
        wheelSpinAnimating = true;
        int seq = wheelSpinSeq.incrementAndGet();

        // steps: fast start + slow end, guaranteed to land on target
        int baseCycles = 3 + (int) (System.nanoTime() % 3); // 3..5 cycles
        int steps = baseCycles * WHEEL_SEGMENTS + Math.floorMod(targetIndex - wheelCursor, WHEEL_SEGMENTS);
        if (steps < WHEEL_SEGMENTS * 3) {
            steps += WHEEL_SEGMENTS * 2;
        }
        int totalSteps = Math.min(90, Math.max(35, steps));

        UICommandBuilder init = new UICommandBuilder();
        applyWheelSpinButtonsLocked(init);
        clearWheelHighlights(init);
        sendUpdate(init, false);

        scheduleWheelTick(seq, 0, totalSteps, targetIndex, onFinish);
    }

    private int rewardSectorIndex(String itemId) {
        return catalog().sectorIndexForItem(itemId);
    }

    private void clearWheelHighlights(UICommandBuilder b) {
        for (String id : WHEEL_HIGHLIGHT_IDS) {
            b.set(id + ".Visible", false);
        }
    }

    private void setWheelHighlight(UICommandBuilder b, int sectorIndex) {
        int panel = WHEEL_HIGHLIGHT_PANEL[Math.floorMod(sectorIndex, WHEEL_SEGMENTS)];
        for (int i = 0; i < WHEEL_SEGMENTS; i++) {
            b.set(WHEEL_HIGHLIGHT_IDS[i] + ".Visible", i == panel);
        }
    }

    private void setWheelRewardIcon(UICommandBuilder b, MarketCatalog.SpinResult picked) {
        // For chest rewards use the chest's slot id to look up the sector index.
        // For direct slots use the item id as before.
        String lookupId = picked.isChestReward() ? picked.chestSlotId() : picked.itemId();
        int index = rewardSectorIndex(lookupId);
        for (int i = 0; i < WHEEL_SEGMENTS; i++) {
            b.set(WHEEL_REWARD_ICON_IDS[i] + ".Visible", i == index);
        }
    }

    /** Устаревшая перегрузка — оставлена для совместимости с кодом вне спина. */
    private void setWheelRewardIcon(UICommandBuilder b, String itemId) {
        int index = rewardSectorIndex(itemId);
        for (int i = 0; i < WHEEL_SEGMENTS; i++) {
            b.set(WHEEL_REWARD_ICON_IDS[i] + ".Visible", i == index);
        }
    }

    private void clearWheelRewardIcons(UICommandBuilder b) {
        for (String id : WHEEL_REWARD_ICON_IDS) {
            b.set(id + ".Visible", false);
        }
    }

    private void clearWheelRewardText(UICommandBuilder b) {
        b.set("#WheelRewardYouReceived.Text", "Вы получили:");
        b.set("#WheelRewardItemName.Text", "—");
        b.set("#WheelRewardRarity.Text", "Редкость: —");
    }

    private void setWheelRewardDetails(UICommandBuilder b, MarketCatalog.SpinResult picked) {
        b.set("#WheelRewardYouReceived.Text", "Вы получили:");
        b.set("#WheelRewardItemName.Text", wheelRewardDisplayName(picked));
        b.set("#WheelRewardRarity.Text", "Редкость: " + MarketCatalog.rarityLabel(picked.rarity()));
    }

    /** Устаревшая перегрузка — оставлена для вызовов вне нового спина. */
    private void setWheelRewardDetails(UICommandBuilder b, String name, String itemId, int qty) {
        String displayName = wheelRewardDisplayNameLegacy(name, itemId, qty);
        b.set("#WheelRewardYouReceived.Text", "Вы получили:");
        b.set("#WheelRewardItemName.Text", displayName);
        b.set("#WheelRewardRarity.Text", "Редкость: " + MarketCatalog.rarityLabel(wheelItemRarity(itemId)));
    }

    private static String wheelRewardDisplayName(MarketCatalog.SpinResult picked) {
        String type = picked.rewardType();
        if ("item".equals(type) || "pack".equals(type)) {
            String base = (picked.displayName() != null && !picked.displayName().isBlank()
                    && (picked.itemId() == null || !picked.displayName().equals(picked.itemId())))
                    ? picked.displayName()
                    : (picked.itemId() != null ? MarketCatalog.officialRuItemName(picked.itemId()) : "");
            if (base.isBlank() && picked.itemId() != null) base = picked.itemId();
            return picked.quantity() > 1 ? base + " x" + picked.quantity() : base;
        }
        return picked.displayName() != null ? picked.displayName() : "";
    }

    private static String wheelRewardDisplayNameLegacy(String name, String itemId, int qty) {
        String displayName = name != null && !name.isBlank() && (itemId == null || !name.equals(itemId))
                && !("Potion_Poison".equals(itemId)
                && name.toLowerCase(java.util.Locale.ROOT).contains("декоратив"))
                ? name
                : MarketCatalog.officialRuItemName(itemId);
        if (qty > 1) displayName = displayName + " x" + qty;
        return displayName;
    }

    private String wheelItemRarity(String itemId) {
        return catalog().rarityForItem(itemId);
    }

    private static String formatWheelRemaining(long remainingMs) {
        long totalSec = Math.max(0, remainingMs / 1000);
        long hours = totalSec / 3600;
        long minutes = (totalSec % 3600) / 60;
        long seconds = totalSec % 60;
        if (hours > 0) {
            return hours + " ч " + minutes + " м " + seconds + " с";
        }
        if (minutes > 0) {
            return minutes + " м " + seconds + " с";
        }
        return seconds + " с";
    }

    private void startWheelTimer() {
        stopWheelTimer();
        wheelTimerTask = UI_SCHEDULER.scheduleAtFixedRate(this::tickWheelTimer, 1, 1, TimeUnit.SECONDS);
    }

    private void stopWheelTimer() {
        ScheduledFuture<?> t = wheelTimerTask;
        wheelTimerTask = null;
        if (t != null) {
            try {
                t.cancel(false);
            } catch (Throwable ignore) {
            }
        }
    }

    private void tickWheelTimer() {
        if (!"wheel".equals(currentPage)) {
            stopWheelTimer();
            return;
        }
        try {
            Object roulette = findRoulettePlugin();
            if (roulette == null) {
                return;
            }
            Object dataManager = reflectField(roulette, "dataManager");
            if (dataManager == null) {
                return;
            }
            UICommandBuilder b = new UICommandBuilder();
            applyWheelDailySpinLines(b, dataManager, playerRef.getUuid());
            sendUpdate(b, false);
        } catch (Throwable ignore) {
        }
    }

    private void applyWheelDailySpinLines(UICommandBuilder b, Object dataManager, UUID uuid) throws Exception {
        Object playerData = dataManager.getClass().getMethod("getPlayerData", UUID.class).invoke(dataManager, uuid);
        boolean canSpin = (boolean) playerData.getClass().getMethod("canSpin").invoke(playerData);
        long remainingMs = (long) playerData.getClass().getMethod("getRemainingTime").invoke(playerData);

        b.set("#WheelFreeSpinLine.Text", canSpin ? "Бесплатный спин: доступен" : "Бесплатный спин: недоступен");
        b.set(
                "#WheelResetTimer.Text",
                canSpin ? "Сброс: доступен сейчас" : ("Сброс через: " + formatWheelRemaining(remainingMs))
        );
        int cost = plugin.config().wheelSpinCrystalCost;
        b.set("#WheelPaidSpinLine.Text", "Платный спин: " + cost + " алмазов");
        b.set("#WheelStreakLine.Text", "Серия входов: день 4 / 7");
        b.set("#WheelDay7Bonus.Text", "День 7: гарантированная эпическая награда");
        applyWheelSpinButtonVisibility(b, canSpin, cost);
    }

    private void scheduleWheelTick(int seq, int step, int totalSteps, int targetIndex, Runnable onFinish) {
        if (wheelSpinSeq.get() != seq) return;

        // advance cursor, show white highlight overlay on active sector
        wheelCursor = (wheelCursor + 1) % WHEEL_SEGMENTS;
        UICommandBuilder b = new UICommandBuilder();
        setWheelHighlight(b, wheelCursor);
        sendUpdate(b, false);

        if (step + 1 >= totalSteps) {
            if (wheelSpinSeq.get() == seq) {
                wheelCursor = targetIndex;
                UICommandBuilder fin = new UICommandBuilder();
                setWheelHighlight(fin, targetIndex);
                fin.set("#WheelAnimHint.Text", "");
                sendUpdate(fin, false);
                if (onFinish != null) {
                    onFinish.run();
                }
            }
            return;
        }

        // easing: start fast, slow down smoothly
        double t = (double) step / Math.max(1, (totalSteps - 1));
        double eased = t * t; // quadratic ease-in (delay grows slowly then faster)
        long delayMs = (long) (55 + (240 - 55) * eased); // 55ms -> 240ms

        wheelSpinTask = UI_SCHEDULER.schedule(
                () -> scheduleWheelTick(seq, step + 1, totalSteps, targetIndex, onFinish),
                delayMs,
                TimeUnit.MILLISECONDS
        );
    }

    private void stopWheelAnimation() {
        wheelSpinAnimating = false;
        ScheduledFuture<?> t = wheelSpinTask;
        wheelSpinTask = null;
        if (t != null) {
            try {
                t.cancel(false);
            } catch (Throwable ignore) {
            }
        }
    }

    private void refreshWheelSidebar(UICommandBuilder b, Object roulette, Object dataManager, UUID uuid) {
        try {
            Object cfg = roulette.getClass().getMethod("getConfigData").invoke(roulette);
            setWheelPoolColumns(b, cfg);
            applyWheelDailySpinLines(b, dataManager, uuid);
            b.set("#WheelDropRatesBody.Text", "Обычное 60%\nРедкое 28%\nЭпическое 10%\nЛегендарное 2%");
            int cost = plugin.config().wheelSpinCrystalCost;
            b.set(
                    "#WheelPoolInfoHint.Text",
                    "Один бесплатный спин каждые 24 ч.\nПосле бесплатного: " + cost + " алмазов."
            );
            b.set("#WheelSpinPaidButton.Text", "Крутить — " + cost + " алмазов");
        } catch (Throwable ignore) {
        }
    }

    private void setWheelPoolColumns(UICommandBuilder b, Object cfg) {
        StringBuilder col1 = new StringBuilder();
        StringBuilder col2 = new StringBuilder();
        MarketCatalog cat = catalog();
        for (int i = 0; i < 6; i++) {
            col1.append(i + 1).append(". ").append(cat.wheelDisplayNameAtSector(i)).append("\n");
        }
        for (int i = 6; i < 12; i++) {
            col2.append(i + 1).append(". ").append(cat.wheelDisplayNameAtSector(i)).append("\n");
        }
        b.set("#WheelPoolInfoCol1.Text", col1.toString().trim());
        b.set("#WheelPoolInfoCol2.Text", col2.toString().trim());
    }

    private Object findRoulettePlugin() {
        PluginManager pm = PluginManager.get();
        if (pm == null) return null;
        for (PluginBase p : pm.getPlugins()) {
            if (p != null && ROULETTE_PLUGIN_CLASS.equals(p.getClass().getName())) {
                return p;
            }
        }
        return null;
    }

    private static Object reflectField(Object obj, String fieldName) {
        if (obj == null) return null;
        try {
            Field f = obj.getClass().getDeclaredField(fieldName);
            f.setAccessible(true);
            return f.get(obj);
        } catch (Throwable t) {
            return null;
        }
    }

    private void onPay(PayEventData data) {
        YooKassaConfig cfg = plugin.config();
        String playerName = playerRef.getUsername();
        UUID playerUuid = playerRef.getUuid();

        if (!cfg.isValid()) {
            flash("Задайте shop_id и secret_key в yookassa.properties или env YOOKASSA_*.");
            return;
        }

        String mode = data.mode == null ? "card" : data.mode.trim().toLowerCase();
        BigDecimal amount = parseAmount(data.amount);
        if (amount == null) {
            return;
        }

        String returnUrl = cfg.returnUrl.isBlank() ? "https://yookassa.ru/" : cfg.returnUrl;
        Map<String, String> meta = new HashMap<>();
        meta.put("player_uuid", playerUuid.toString());
        meta.put("player_name", playerName != null ? playerName : "");
        meta.put("pay_mode", mode);
        meta.put("credit_currency", pendingTopupCurrency != null ? pendingTopupCurrency : "coins");
        pendingPayRubAmount = amount;

        String desc = "Платёж игрока " + (playerName != null ? playerName : playerUuid);
        currentPage = "wallet";
        UICommandBuilder nav = new UICommandBuilder();
        showPage(nav, "wallet");
        sendUpdate(nav, false);
        flash(switch (mode) {
            case "sbp" -> "Создаём платёж СБП…";
            case "repeat" -> "Списываем повторный платёж…";
            default -> "Создаём платёж…";
        });

        log.atInfo().log("[YooKassa] pay mode=%s player=%s amount=%s save=%s", mode, playerName, amount, saveForRepeat);

        CompletableFuture
                .supplyAsync(
                        () -> createForMode(cfg, mode, amount, desc, returnUrl, meta, playerUuid),
                        ForkJoinPool.commonPool()
                )
                .orTimeout(API_TIMEOUT_SEC, TimeUnit.SECONDS)
                .whenComplete((r, ex) -> world.execute(() -> finishCreate(r, ex, mode, playerUuid, playerName)));
    }

    private YooKassaApi.PaymentResult createForMode(
            YooKassaConfig cfg,
            String mode,
            BigDecimal amount,
            String desc,
            String returnUrl,
            Map<String, String> meta,
            UUID playerUuid
    ) {
        try {
            UUID idem = UUID.randomUUID();
            return switch (mode) {
                case "sbp" -> createSbpOrRedirect(
                        cfg, amount, desc, returnUrl, meta, idem
                );
                case "repeat" -> {
                    String pmId = plugin.savedMethods().getPaymentMethodId(playerUuid);
                    if (pmId == null || pmId.isBlank()) {
                        yield YooKassaApi.PaymentResult.error(
                                -1, "no_saved_method",
                                "Нет сохранённого способа. Оплатите с «Запомнить способ: да»."
                        );
                    }
                    yield api.createAutopayment(
                            cfg.shopId, cfg.secretKey, amount, desc, meta, pmId, idem, log
                    );
                }
                default -> api.createRedirectPayment(
                        cfg.shopId, cfg.secretKey, amount, desc, returnUrl, meta, saveForRepeat, idem, log
                );
            };
        } catch (Exception e) {
            log.atSevere().withCause(e).log("[YooKassa] API failed mode=%s", mode);
            return YooKassaApi.PaymentResult.error(
                    -1, e.getClass().getSimpleName(),
                    e.getMessage() != null ? e.getMessage() : String.valueOf(e)
            );
        }
    }

    private YooKassaApi.PaymentResult createSbpOrRedirect(
            YooKassaConfig cfg,
            BigDecimal amount,
            String desc,
            String returnUrl,
            Map<String, String> meta,
            UUID idem
    ) throws Exception {
        if (YooKassaApi.isTestSecret(cfg.secretKey)) {
            log.atWarning().log(
                    "[YooKassa] test_* ключ: СБП в тестовом магазине недоступен, создаём обычный redirect"
            );
            return api.createRedirectPayment(
                    cfg.shopId, cfg.secretKey, amount, desc, returnUrl, meta, saveForRepeat, idem, log
            );
        }
        YooKassaApi.PaymentResult sbp =
                api.createSbpPayment(
                        cfg.shopId, cfg.secretKey, amount, desc, returnUrl, meta, saveForRepeat, idem, log
                );
        if (sbp.ok() || !YooKassaApi.isPaymentMethodUnavailable(sbp)) {
            return sbp;
        }
        log.atWarning().log(
                "[YooKassa] СБП не подключён в кабинете (%s), fallback на redirect",
                sbp.errorDetail()
        );
        return api.createRedirectPayment(
                cfg.shopId, cfg.secretKey, amount, desc, returnUrl, meta, saveForRepeat, UUID.randomUUID(), log
        );
    }

    private void finishCreate(
            YooKassaApi.PaymentResult r,
            Throwable ex,
            String mode,
            UUID playerUuid,
            String playerName
    ) {
        try {
            if (ex != null) {
                flash(ex instanceof TimeoutException
                        ? "Таймаут ЮKassa (" + API_TIMEOUT_SEC + " с)."
                        : "Ошибка: " + ex.getMessage());
                return;
            }
            if (r == null || !r.ok()) {
                flash(r == null
                        ? "Пустой ответ ЮKassa."
                        : "Ошибка HTTP " + r.httpStatus() + ": " + r.errorType() + " — " + r.errorDetail());
                return;
            }

            maybeStoreSavedMethod(r, playerUuid);

            String confirmUrl = r.confirmationUrl();

            if ("repeat".equals(mode) || confirmUrl == null || confirmUrl.isBlank()) {
                UICommandBuilder b = new UICommandBuilder();
                showWaitStep(b);
                b.set("#WaitTitle.Text", "Платёж " + r.paymentId());
                b.set(
                        "#WaitHint.Text",
                        "repeat".equals(mode)
                                ? "Повторный платёж — ожидаем подтверждение от ЮKassa…"
                                : "Ожидаем подтверждение от ЮKassa…"
                );
                sendUpdate(b, false);
                if (r.isTerminal()) {
                    onPaymentTerminal(r, playerUuid);
                } else {
                    startPolling(r.paymentId(), playerUuid, false);
                }
                return;
            }

            UICommandBuilder b = new UICommandBuilder();
            showWaitStep(b);
            showPayLink(b, confirmUrl, mode);
            b.set("#WaitTitle.Text", "Платёж " + r.paymentId());
            b.set(
                    "#WaitHint.Text",
                    "Нажмите зелёную кнопку — появится ссылка для оплаты."
            );
            sendUpdate(b, false);

            if ("sbp".equals(mode) && !YooKassaApi.isSbpConfirmationUrl(confirmUrl)) {
                flash(
                        YooKassaApi.isTestSecret(plugin.config().secretKey)
                                ? "СБП в тестовом магазине ЮKassa недоступен — открыта оплата картой. Для СБП нужен боевой ключ (live_…)."
                                : "СБП не подключён в кабинете ЮKassa — открыта обычная страница оплаты."
                );
            }

            startPolling(r.paymentId(), playerUuid, saveForRepeat);
            log.atInfo().log("[YooKassa] payment ok player=%s mode=%s id=%s", playerName, mode, r.paymentId());
        } catch (Throwable t) {
            log.atSevere().withCause(t).log("[YooKassa] finishCreate failed");
            flash("Ошибка: " + t.getMessage());
        }
    }

    private void startPolling(String paymentId, UUID playerUuid, boolean watchSave) {
        watchingPaymentId = paymentId;
        plugin.paymentWatcher()
                .watch(
                        paymentId,
                        playerUuid,
                        world,
                        pendingPayRubAmount,
                        pendingTopupCurrency,
                        watchSave,
                        r -> onPaymentTerminal(r, playerUuid)
                );
    }

    /** UI закрыт — опрос платежа на уровне плагина продолжается. */
    private void stopPolling() {
        if (watchingPaymentId != null) {
            plugin.paymentWatcher().detachUi(watchingPaymentId);
            watchingPaymentId = null;
        }
    }

    private void onPaymentTerminal(YooKassaApi.PaymentResult r, UUID playerUuid) {
        maybeStoreSavedMethod(r, playerUuid);
        UICommandBuilder b = new UICommandBuilder();
        if ("succeeded".equals(r.status())) {
            BigDecimal rub = pendingPayRubAmount;
            String creditCur = pendingTopupCurrency != null ? pendingTopupCurrency : "coins";
            int kitCoins = pendingKitPackCoins;
            pendingKitPackCoins = 0;
            if (rub != null && rub.compareTo(BigDecimal.ZERO) > 0) {
                YooKassaConfig cfg = plugin.config();
                PlayerWalletClient.WalletResult credit = kitCoins > 0
                        ? plugin.walletClient().creditYooKassaFixed(
                                r.paymentId(), playerUuid, creditCur, kitCoins, rub,
                                cfg.marketCatalogUrl, cfg.marketCatalogApiKey, log)
                        : plugin.walletClient().creditYooKassa(
                                r.paymentId(), playerUuid, creditCur, rub,
                                cfg.marketCatalogUrl, cfg.marketCatalogApiKey, log);
                if (credit.ok()) {
                    applyBalances(b, credit.balances());
                    String unit = "crystals".equals(creditCur) ? "алмазов" : "монет";
                    if (credit.alreadyCredited()) {
                        b.set("#WaitHint.Text", "Платёж уже был зачислен ранее.");
                    } else {
                        b.set(
                                "#WaitHint.Text",
                                "Зачислено " + credit.gameAmount() + " " + unit + " (платёж " + r.paymentId() + ")."
                        );
                        flash("Зачислено " + credit.gameAmount() + " " + unit);
                    }
                } else {
                    b.set(
                            "#WaitHint.Text",
                            "Платёж успешен, но зачисление не выполнено: "
                                    + (credit.error() != null ? credit.error() : "ошибка API")
                    );
                    log.atWarning().log("[Wallet] credit failed payment=%s: %s", r.paymentId(), credit.error());
                }
            } else {
                b.set("#WaitHint.Text", "Платёж " + r.paymentId() + " успешно завершён.");
            }
            b.set("#WaitTitle.Text", "Оплачено");
            hidePayLink(b);
        } else {
            b.set("#WaitTitle.Text", "Не оплачено");
            b.set("#WaitHint.Text", "Платёж " + r.paymentId() + ": статус " + r.status());
            hidePayLink(b);
        }
        refreshSavedHint(b);
        sendUpdate(b, false);
        watchingPaymentId = null;
    }

    private void maybeStoreSavedMethod(YooKassaApi.PaymentResult r, UUID playerUuid) {
        if (r == null || !r.paymentMethodSaved()) {
            return;
        }
        String pmId = r.paymentMethodId();
        if (pmId == null || pmId.isBlank()) {
            return;
        }
        plugin.savedMethods().save(playerUuid, pmId, r.paymentMethodTitle());
        log.atInfo().log("[YooKassa] saved payment_method for %s: %s", playerUuid, pmId);
    }

    private BigDecimal parseAmount(String raw) {
        String s = raw == null ? "" : raw.trim().replace(',', '.');
        s = s.replaceAll("[^0-9.]", "");
        try {
            BigDecimal amount = new BigDecimal(s.isEmpty() ? "0" : s);
            if (amount.compareTo(BigDecimal.ZERO) <= 0) {
                flash("Сумма должна быть больше 0.");
                return null;
            }
            return amount;
        } catch (Exception e) {
            flash("Некорректная сумма.");
            return null;
        }
    }

    private void flash(String message) {
        try {
            playerRef.sendMessage(Message.raw(message != null ? message : "").color(Color.ORANGE));
        } catch (Throwable t) {
            // ignored
        }
    }

    public static final class PayEventData {
        public String action;
        public String page;
        public String item;
        public String category;
        public String mode;
        public String amount;
        public String packSubTab;
        public String packIdx;
        public String voucherCode;

        public static final BuilderCodec<PayEventData> CODEC =
                BuilderCodec.builder(PayEventData.class, PayEventData::new)
                        .append(new KeyedCodec<>("Action", Codec.STRING), (d, v) -> d.action = v, d -> d.action)
                        .add()
                        .append(new KeyedCodec<>("Page", Codec.STRING), (d, v) -> d.page = v, d -> d.page)
                        .add()
                        .append(new KeyedCodec<>("Item", Codec.STRING), (d, v) -> d.item = v, d -> d.item)
                        .add()
                        .append(new KeyedCodec<>("Category", Codec.STRING), (d, v) -> d.category = v, d -> d.category)
                        .add()
                        .append(new KeyedCodec<>("Mode", Codec.STRING), (d, v) -> d.mode = v, d -> d.mode)
                        .add()
                        .append(new KeyedCodec<>("@AmountField", Codec.STRING), (d, v) -> d.amount = v, d -> d.amount)
                        .add()
                        .append(new KeyedCodec<>("PackSubTab", Codec.STRING), (d, v) -> d.packSubTab = v, d -> d.packSubTab != null ? d.packSubTab : "")
                        .add()
                        .append(new KeyedCodec<>("PackIdx", Codec.STRING), (d, v) -> d.packIdx = v, d -> d.packIdx != null ? d.packIdx : "")
                        .add()
                        .append(new KeyedCodec<>("@VoucherCodeField", Codec.STRING), (d, v) -> d.voucherCode = v, d -> d.voucherCode != null ? d.voucherCode : "")
                        .add()
                        .build();
    }
}
