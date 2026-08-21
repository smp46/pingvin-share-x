import { randomBytes } from "crypto";
import {
  RUN_ID,
  api,
  createShareWithFile,
  deleteAccount,
  removeShare,
  signUp,
  sleep,
} from "./helpers/api";

// The EICAR test signature, assembled at runtime. Kept out of the file as a
// single literal so this source does not get quarantined by a scanner
// walking the repository.
const eicar = () =>
  Buffer.from(
    ["X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR", "STANDARD", "ANTIVIRUS", "TEST", "FILE!$H+H*"].join(
      "-",
    ),
  );

const fileIsGone = async (shareId: string, fileId: string, jar: any) => {
  const res = await api(`/shares/${shareId}/files/${fileId}`, { jar });
  return res.status === 404;
};

describe("antivirus scanning", () => {
  let owner: Awaited<ReturnType<typeof signUp>>;
  const shares: string[] = [];

  beforeAll(async () => {
    owner = await signUp("av");
  }, 60_000);

  afterAll(async () => {
    for (const id of shares) await removeShare(owner.jar, id);
    if (owner) await deleteAccount(owner.jar);
  });

  it("removes the files of a share carrying a known virus", async () => {
    const shareId = `${RUN_ID}-eicar`;
    shares.push(shareId);

    const { fileId } = await createShareWithFile(owner.jar, shareId, eicar(), {
      fileName: "eicar.txt",
    });

    // the scan is kicked off in the background by complete
    const deadline = Date.now() + 90_000;
    let removed = false;
    while (Date.now() < deadline) {
      if (await fileIsGone(shareId, fileId, owner.jar)) {
        removed = true;
        break;
      }
      await sleep(3000);
    }

    if (!removed) {
      throw new Error(
        "the EICAR file was still downloadable after 90s. ClamAV is probably " +
          "not reachable from the backend, check the clamav container and " +
          "CLAMAV_HOST before treating this as a code failure",
      );
    }

    expect(removed).toBe(true);
  }, 150_000);

  it("leaves an ordinary file alone", async () => {
    const shareId = `${RUN_ID}-clean`;
    shares.push(shareId);

    const content = randomBytes(4096);
    const { fileId } = await createShareWithFile(owner.jar, shareId, content);

    // give the scanner the same chance it had to delete the infected one
    await sleep(8000);

    const download = await api(`/shares/${shareId}/files/${fileId}`, {
      jar: owner.jar,
    });
    expect(download.status).toBe(200);
    expect(download.body.length).toBe(content.length);
  }, 120_000);
});
