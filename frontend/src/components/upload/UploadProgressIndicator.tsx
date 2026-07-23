import { useEffect, useRef, useState } from "react";
import { Loader, RingProgress, Text } from "@mantine/core";
import { TbCircleCheck } from "react-icons/tb";
import { HoverTip } from "../core/HoverTip";
import { useIntl } from "react-intl";

const UploadProgressIndicator = ({ progress }: { progress: number }) => {
  const intl = useIntl();
  const startTimeRef = useRef<number | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);

  useEffect(() => {
    if (progress <= 0 || progress >= 100) {
      startTimeRef.current = null;
      setRemainingSeconds(null);
      return;
    }

    if (!startTimeRef.current) {
      startTimeRef.current = Date.now();
      return;
    }

    const elapsedMs = Date.now() - startTimeRef.current;
    if (elapsedMs > 500) {
      const rate = progress / 100;
      const totalMs = elapsedMs / rate;
      const remainingMs = totalMs - elapsedMs;
      setRemainingSeconds(remainingMs / 1000);
    }
  }, [progress]);

  const formatRemainingTime = (seconds: number | null): string => {
    if (seconds === null || !isFinite(seconds) || seconds < 0) {
      return intl.formatMessage({
        id: "upload.filelist.estimating",
      });
    }

    let timeStr = "";
    if (seconds < 60) {
      timeStr = `${Math.round(seconds)}s`;
    } else {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = Math.round(seconds % 60);
      if (minutes < 60) {
        timeStr = `${minutes}m ${remainingSeconds}s`;
      } else {
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        timeStr = `${hours}h ${remainingMinutes}m`;
      }
    }

    return intl.formatMessage(
      {
        id: "upload.filelist.remaining",
      },
      { time: timeStr },
    );
  };

  if (progress > 0 && progress < 100) {
    const tooltipLabel = formatRemainingTime(remainingSeconds);
    return (
      <HoverTip label={tooltipLabel}>
        <div
          style={{
            display: "inline-flex",
            justifyContent: "center",
            alignItems: "center",
            width: 40,
            height: 40,
          }}
        >
          <RingProgress
            sections={[{ value: progress, color: "victoria" }]}
            thickness={3}
            size={40}
            label={
              <Text size="xs" color="victoria" weight={500} align="center">
                {Math.min(Math.round(progress), 99)}%
              </Text>
            }
          />
        </div>
      </HoverTip>
    );
  } else if (progress >= 100) {
    return (
      <div
        style={{
          display: "inline-flex",
          justifyContent: "center",
          alignItems: "center",
          width: 40,
          height: 40,
        }}
      >
        <TbCircleCheck color="green" size={22} />
      </div>
    );
  } else {
    return (
      <div
        style={{
          display: "inline-flex",
          justifyContent: "center",
          alignItems: "center",
          width: 40,
          height: 40,
        }}
      >
        <Loader color="red" size={19} />
      </div>
    );
  }
};

export default UploadProgressIndicator;
