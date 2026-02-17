import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_BASEURL,
});

API.interceptors.request.use((config) => {
  const localData = localStorage.getItem("appData");
  const appData = JSON.parse(localData);

  if (appData?.token) {
    config.headers.Authorization = `Bearer ${appData.token}`;
  }

  return config;
});

export default API;
