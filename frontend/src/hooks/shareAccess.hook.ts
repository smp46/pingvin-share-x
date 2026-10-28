import { ModalsContextProps } from "@mantine/modals/lib/context";
import { useEffect, useState } from "react";
import showEnterPasswordModal from "../components/share/showEnterPasswordModal";
import shareService from "../services/share.service";
import { Share } from "../types/share.type";

type LinkError = { title: string; description?: string; message?: string };

// GET and token requests share one access policy, including terminal tripwire errors.
const useShareAccess = ({
  shareId,
  modals,
}: {
  shareId: string;
  modals: ModalsContextProps;
}) => {
  const [share, setShare] = useState<Share>();
  const [isRestricted, setIsRestricted] = useState(false);
  const [error, setError] = useState<LinkError>();

  useEffect(() => {
    let active = true;
    let passwordModal: string | undefined;
    setShare(undefined);
    setIsRestricted(false);
    setError(undefined);
    const closePassword = () => {
      if (passwordModal) modals.closeModal(passwordModal);
      passwordModal = undefined;
    };
    const showPassword = (initialWrong = false) => {
      if (!passwordModal && active) {
        passwordModal = showEnterPasswordModal(modals, getToken, initialWrong);
      }
    };
    const handleError = async (failure: unknown, submittedPassword = false) => {
      if (!active) return;
      const data = (
        failure as {
          response?: { data?: { error?: string; message?: string } };
        }
      )?.response?.data;
      const code = data?.error;
      if (code === "wrong_password") {
        if (submittedPassword) throw failure;
        showPassword(true);
        return;
      }
      if (code === "share_password_required") {
        showPassword();
        return;
      }
      if (code === "share_token_required") {
        await getToken();
        return;
      }
      closePassword();
      setShare(undefined);
      if (code === "share_restricted_to_recipients") {
        setIsRestricted(true);
        return;
      }
      const states: Record<string, LinkError> = {
        share_not_found: {
          title: "share.error.not-found.title",
          description: "share.error.not-found.description",
        },
        share_expired: {
          title: "share.error.expired.title",
          description: "share.error.expired.description",
        },
        share_removed: {
          title: "share.error.removed.title",
          message: data?.message,
        },
        share_max_views_exceeded: {
          title: "share.error.visitor-limit-exceeded.title",
          description: "share.error.visitor-limit-exceeded.description",
        },
        private_share: {
          title: "share.error.access-denied.title",
          description: "share.error.access-denied.description",
        },
      };
      setError(
        states[code || ""] || {
          title: "common.error",
          description: "common.error.unknown",
        },
      );
    };
    async function getFiles() {
      try {
        const result = await shareService.get(shareId);
        if (active) setShare(result);
      } catch (failure) {
        await handleError(failure);
      }
    }
    async function getToken(password?: string) {
      try {
        await shareService.getShareToken(shareId, password);
      } catch (failure) {
        await handleError(failure, password !== undefined);
        return;
      }
      if (!active) return;
      closePassword();
      await getFiles();
    }
    void getFiles();
    return () => {
      active = false;
      closePassword();
    };
    // Modal provider methods are stable; reloading is tied to the route identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shareId]);

  return { share, setShare, isRestricted, error };
};

export default useShareAccess;
