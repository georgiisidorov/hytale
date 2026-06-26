#!/usr/bin/env node
/**
 * Генерирует случайный Base32-секрет для Google Authenticator и ADMIN_TOTP_SECRET.
 * Запуск: npm run gen-totp-secret (из каталога src/frontend)
 */
import { randomBytes } from 'node:crypto';

const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function bytesToBase32(buf) {
	let bits = 0;
	let value = 0;
	let out = '';
	for (let i = 0; i < buf.length; i++) {
		value = (value << 8) | buf[i];
		bits += 8;
		while (bits >= 5) {
			out += BASE32[(value >>> (bits - 5)) & 31];
			bits -= 5;
		}
	}
	if (bits > 0) {
		out += BASE32[(value << (5 - bits)) & 31];
	}
	return out;
}

// 20 байт → 32 символа base32 (как у многих TOTP-секретов)
const secret = bytesToBase32(randomBytes(20));

console.log('');
console.log('1) Добавьте в .env (или .env.local) рядом с фронтом:');
console.log('');
console.log(`ADMIN_TOTP_SECRET=${secret}`);
console.log('');
console.log('2) В Google Authenticator: «+» → «Ввести ключ вручную»');
console.log('   • Имя: любое (например, Target Ads)');
console.log('   • Ключ: скопируйте только секрет (строку выше без ADMIN_TOTP_SECRET=)');
console.log('   • Тип: по времени (TOTP), 30 сек, 6 цифр — как по умолчанию');
console.log('');
