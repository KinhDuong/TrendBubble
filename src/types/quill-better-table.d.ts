declare module 'quill-better-table' {
  interface TableModule {
    insertTable(rows: number, cols: number): void;
  }

  interface BetterTableStatic {
    keyboardBindings: any;
  }

  const QuillBetterTable: BetterTableStatic;
  export default QuillBetterTable;
}

declare module 'quill-better-table/dist/quill-better-table.css';
