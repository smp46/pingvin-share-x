import { Loader, RingProgress, Text } from "@mantine/core";
import { TbCircleCheck } from "react-icons/tb";
const UploadProgressIndicator = ({ progress }: { progress: number }) => {
  if (progress > 0 && progress < 100) {
    return (
      <RingProgress
        sections={[{ value: progress, color: "victoria" }]}
        thickness={3}
        size={40}
        label={
          <Text size="xs" color="victoria" weight={700} align="center">
            {Math.round(progress)}%
          </Text>
        }
      />
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
