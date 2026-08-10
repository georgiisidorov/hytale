import { Navigate, createBrowserRouter } from 'react-router-dom'

import { HomePage } from '@/pages/HomePage'
import { HowToConnectPage } from '@/pages/HowToConnectPage'
import { NewsDetailPage } from '@/pages/NewsDetailPage'
import { NewsListPage } from '@/pages/NewsListPage'
import { VoucherPage } from '@/pages/VoucherPage'

import { BaseLayout } from '@/layouts/BaseLayout'

export const router = createBrowserRouter([
    {
        path: '/',
        element: <BaseLayout />,
        children: [
            { index: true, element: <HomePage /> },
            { path: 'news', element: <NewsListPage /> },
            { path: 'news/:id', element: <NewsDetailPage /> },
            { path: 'how-to-connect', element: <HowToConnectPage /> },
            { path: 'voucher', element: <VoucherPage /> },
            { path: '*', element: <Navigate to="/" replace /> }
        ]
    }
])
