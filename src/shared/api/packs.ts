import { api } from './httpClient'

export type PackId =
    | 'pack_pet_utility'
    | 'pack_iron_adventurer'
    | 'pack_alchemist_premium'
    | 'pack_builder_premium'
    | 'pack_royal_decor'

export interface CreateVoucherPayload {
    paymentId: string
    packId: PackId
    playerUuid?: string
}

interface VoucherResponse {
    ok: true
    code: string
}

export const packsApi = {
    createVoucher: (payload: CreateVoucherPayload) =>
        api.post<VoucherResponse>('/api/hytale/market/packs/voucher', payload)
}
