import axios, { type AxiosInstance } from "axios";

class HttpClient {
  private client: AxiosInstance;

  constructor(baseURL: string) {
    this.client = axios.create({ baseURL });
  }

  getData = async (endpoint: string, params = {}, headers = {}) => {
    try {
      const response = await this.client.get(endpoint, { params, headers });
      return response.data;
    } catch {
      return null;
    }
  };
}

export default HttpClient;
