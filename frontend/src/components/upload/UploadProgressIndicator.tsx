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
    return <TbCircleCheck color="green" size={22} />;
  } else {
    return <Loader color="red" size={19} />;
  }
};

export default UploadProgressIndicator;
