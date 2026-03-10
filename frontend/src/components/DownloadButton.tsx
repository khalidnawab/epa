export default function DownloadButton({ url }: { url: string }) {
  return (
    <a
      href={url}
      download
      className="inline-flex items-center gap-2 mt-2 px-4 py-2 bg-green-700 text-white text-sm rounded-lg hover:bg-green-800 active:bg-green-900 transition-colors"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-4 w-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
      Download PDF Report
    </a>
  );
}
