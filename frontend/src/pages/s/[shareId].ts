import { GetServerSidePropsContext } from "next";
import { getQueryString } from "../../utils/router.util";

// Redirect to the share page
export function getServerSideProps(context: GetServerSidePropsContext) {
  const { shareId } = context.params!;
  const recipientId = getQueryString(context.query.recipient);

  return {
    props: {},
    redirect: {
      permanent: false,
      destination:
        "/share/" +
        shareId +
        (recipientId ? `?recipient=${encodeURIComponent(recipientId)}` : ""),
    },
  };
}

export default function ShareAlias() {
  return null;
}
