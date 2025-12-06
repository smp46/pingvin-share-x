import { ColorSchemeScript } from "@mantine/core";
import createEmotionServer from "@emotion/server/create-instance";
import { createEmotionCache } from "../utils/createEmotionCache";
import Document, {
  DocumentContext,
  Head,
  Html,
  Main,
  NextScript,
} from "next/document";

export default class _Document extends Document {
  static async getInitialProps(ctx: DocumentContext) {
    const initialProps = await Document.getInitialProps(ctx);
    const cache = createEmotionCache();
    const { extractCriticalToChunks } = createEmotionServer(cache);

    const emotionStyles = extractCriticalToChunks(initialProps.html);
    const emotionStyleTags = emotionStyles.styles.map((style) => (
      <style
        data-emotion={`${style.key} ${style.ids.join(" ")}`}
        key={style.key}
        dangerouslySetInnerHTML={{ __html: style.css }}
      />
    ));

    return {
      ...initialProps,
      styles: [
        ...emotionStyleTags,
        ...(Array.isArray(initialProps.styles)
          ? initialProps.styles
          : [initialProps.styles]),
      ],
    };
  }

  render() {
    return (
      <Html>
        <Head>
          <ColorSchemeScript />
          <link rel="manifest" href="/manifest.json" />
          <link rel="icon" type="image/x-icon" href="/img/favicon.ico" />
          <link rel="apple-touch-icon" href="/img/icons/icon-128x128.png" />

          <meta name="robots" content="noindex" />
          <meta name="theme-color" content="#46509e" />
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}
