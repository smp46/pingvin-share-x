import api from "./api.service";

export interface SystemInfo {
  used: number;
  total: number;
}

const getSystemInfo = async (): Promise<SystemInfo | null> => {
  return (await api.get("system/info")).data;
};

export default { getSystemInfo };
