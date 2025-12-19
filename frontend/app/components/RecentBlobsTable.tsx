'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import type { RecentBlob } from '../types';
import { shortenAddress, formatDate, formatDateShort, getExplorerUrl } from '../lib/utils';

interface RecentBlobsTableProps {
  blobs: RecentBlob[];
}

export function RecentBlobsTable({ blobs }: RecentBlobsTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  if (blobs.length === 0) {
    return null;
  }

  const toggleRow = (index: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedRows(newExpanded);
  };

  return (
    <div className="bg-slate-800/50 backdrop-blur-md rounded-3xl p-8 shadow-2xl border border-slate-700">
      <h2 className="text-3xl font-bold mb-6 text-center text-slate-200">Recent Blobs</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-base">
          <thead>
            <tr className="border-b border-slate-700 text-slate-400">
              <th className="text-left p-4 w-12"></th>
              <th className="text-left p-4">Creator</th>
              <th className="text-left p-4">Message</th>
              <th className="text-left p-4">Date</th>
              <th className="text-left p-4">Link</th>
            </tr>
          </thead>
          <tbody>
            {blobs.map((blob, idx) => {
              const isExpanded = expandedRows.has(idx);
              const displayMessage = isExpanded ? blob.message : (blob.message.length > 40 ? blob.message.substring(0, 40) + '...' : blob.message);
              const creatorUrl = getExplorerUrl('address', blob.creator);
              // Use escrowId as unique key instead of index
              const rowKey = blob.escrowId || `blob-${idx}`;

              return (
                <React.Fragment key={rowKey}>
                  <tr
                    className="border-b border-slate-800 hover:bg-slate-700/30 transition-colors duration-200 cursor-pointer"
                    onClick={() => toggleRow(idx)}
                  >
                    <td className="p-4 text-slate-400 w-8">
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </td>
                    <td className="p-4 text-slate-300 whitespace-nowrap">
                      <a
                        href={creatorUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-indigo-400 hover:text-indigo-300 hover:underline transition-colors duration-200 flex items-center gap-1"
                      >
                        {shortenAddress(blob.creator)}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </td>
                    <td className="p-4 text-slate-200 max-w-md">
                      <div className="truncate" title={blob.message}>
                        {displayMessage}
                      </div>
                    </td>
                    <td className="p-4 text-slate-400 whitespace-nowrap text-sm">
                      {formatDateShort(blob.date)}
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      <a
                        href={blob.blobscanLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-indigo-400 hover:text-indigo-300 hover:underline transition-colors duration-200 flex items-center gap-1"
                      >
                        View
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr className="border-b border-slate-800 bg-slate-900/50">
                      <td colSpan={5} className="p-6">
                        <div className="space-y-3">
                          <div>
                            <span className="text-slate-400 text-sm font-medium">Full Message:</span>
                            <div className="text-slate-200 mt-1 whitespace-pre-wrap break-words max-w-full overflow-wrap-anywhere p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                              {blob.message}
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-700">
                            <div>
                              <span className="text-slate-400 text-sm font-medium">Creator:</span>
                              <div className="mt-1">
                                <a
                                  href={creatorUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-indigo-400 hover:text-indigo-300 hover:underline transition-colors duration-200 inline-flex items-center gap-1"
                                >
                                  {blob.creator}
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              </div>
                            </div>
                            <div>
                              <span className="text-slate-400 text-sm font-medium">Escrow ID:</span>
                              <p className="text-slate-200 mt-1 font-mono text-sm break-all">{blob.escrowId}</p>
                            </div>
                            <div>
                              <span className="text-slate-400 text-sm font-medium">Date:</span>
                              <p className="text-slate-200 mt-1">{formatDate(blob.date)}</p>
                            </div>
                            <div>
                              <span className="text-slate-400 text-sm font-medium">Blobscan:</span>
                              <div className="mt-1">
                                <a
                                  href={blob.blobscanLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-indigo-400 hover:text-indigo-300 hover:underline transition-colors duration-200 inline-flex items-center gap-1"
                                >
                                  View on Blobscan
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              </div>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
