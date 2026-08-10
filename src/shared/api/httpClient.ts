import type { AxiosRequestConfig, AxiosResponse } from 'axios'

import instance from './interceptors'

export const request = async <T>(config: AxiosRequestConfig): Promise<T> => {
    const onSuccess = (response: AxiosResponse<T>) => response.data

    const onError = (error: unknown) => Promise.reject(error)

    return instance(config).then(onSuccess).catch(onError)
}

export const api = {
    get: <T>(url: string, config?: AxiosRequestConfig) =>
        request<T>({ ...config, method: 'GET', url }),

    post: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
        request<T>({ ...config, method: 'POST', url, data })
}
