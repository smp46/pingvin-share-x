import { Skeleton } from "@mantine/core";
import { Dispatch, ReactNode, SetStateAction } from "react";
import { FormattedMessage } from "react-intl";
import { FileMetaData } from "../../types/File.type";
import { Share } from "../../types/share.type";
import SortableHeader, { TableSort } from "../core/SortIcon";
import FileTree from "../core/FileTree";
import FileActions from "./FileActions";

const getFilePath = (file: FileMetaData) => file.name;
const getFileSize = (file: FileMetaData) => parseInt(file.size);
const getFileKey = (file: FileMetaData) => file.id;

const FileList = ({
  files,
  share,
  isLoading,
  recipientId,
  sort,
  setSort,
  headerExtra,
}: {
  files?: FileMetaData[];
  share: Share;
  isLoading: boolean;
  recipientId?: string;
  sort: TableSort;
  setSort: Dispatch<SetStateAction<TableSort>>;
  headerExtra?: ReactNode;
}) => {
  return (
    <FileTree
      files={files ?? []}
      getPath={getFilePath}
      getSize={getFileSize}
      getKey={getFileKey}
      sort={sort}
      headerExtra={headerExtra}
      loadingRows={isLoading ? skeletonRows : undefined}
      nameHeader={
        <SortableHeader sort={sort} setSort={setSort} property="name">
          <FormattedMessage id="share.table.name" />
        </SortableHeader>
      }
      sizeHeader={
        <SortableHeader sort={sort} setSort={setSort} property="size">
          <FormattedMessage id="share.table.size" />
        </SortableHeader>
      }
      renderFileActions={(file) => (
        <FileActions file={file} share={share} recipientId={recipientId} />
      )}
    />
  );
};

const skeletonRows = [...Array(5)].map((c, i) => (
  <tr key={i}>
    <td>
      <Skeleton height={30} width={30} />
    </td>
    <td>
      <Skeleton height={14} />
    </td>
    <td>
      <Skeleton height={14} />
    </td>
    <td>
      <Skeleton height={25} width={25} />
    </td>
  </tr>
));

export default FileList;
