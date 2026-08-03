import axios from 'axios'

const instance = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || "https://eldheim.online/"
})

export default instance
