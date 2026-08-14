import api from "./api.service";
import { AdminNotice } from "../components/admin/AdminNoticeModal";

const getPendingNotices = async (): Promise<AdminNotice[]> => {
  return (await api.get("/admin-notices/pending")).data;
};

const dismissNotice = async (id: string): Promise<void> => {
  await api.post(`/admin-notices/${id}/dismiss`);
};

export default {
  getPendingNotices,
  dismissNotice,
};
