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
    <div className="bg-slate-800/50 backdrop-blur-md rounded-2xl p-4 md:p-6 shadow-2xl border border-slate-700 max-w-2xl mx-auto">
      <h2 className="text-xl font-bold mb-5 text-center text-slate-200">Recent Blobs</h2>
      
      {/* Mobile Card View */}
      <div className="block md:hidden space-y-3">
        {blobs.map((blob, idx) => {
          const isExpanded = expandedRows.has(idx);
          const creatorUrl = getExplorerUrl('address', blob.creator);
          const rowKey = blob.escrowId || `blob-${idx}`;

          return (
            <div
              key={rowKey}
              className="bg-slate-900/50 rounded-lg border border-slate-700 px-2 py-1.5 cursor-pointer hover:bg-slate-800/50 transition-colors"
              onClick={() => toggleRow(idx)}
            >
              <div className="flex items-start justify-between gap-1 mb-1">
                <div className="flex-1 min-w-0">
                  <p className="text-slate-200 text-sm break-words leading-relaxed">
                    {isExpanded ? blob.message : (blob.message.length > 60 ? blob.message.substring(0, 60) + '...' : blob.message)}
                  </p>
                </div>
                <button className="flex-shrink-0 text-slate-400 -mr-1 -mt-0.5 p-0">
                  {isExpanded ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
              
              <div className="flex items-center justify-between text-xs text-slate-400 mt-1">
                <a
                  href={creatorUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-indigo-400 hover:text-indigo-300 hover:underline transition-colors inline-flex items-center gap-1"
                >
                  {shortenAddress(blob.creator)}
                  <ExternalLink className="w-3 h-3" />
                </a>
                <span>{formatDateShort(blob.date)}</span>
              </div>

              {isExpanded && (
                <div className="mt-3 pt-3 border-t border-slate-700 space-y-3">
                  <div>
                    <span className="text-slate-400 text-xs font-medium block mb-1.5">Full Message:</span>
                    <div className="text-slate-200 whitespace-pre-wrap break-words p-2.5 bg-slate-800/50 rounded border border-slate-700 text-xs leading-relaxed">
                      {blob.message}
                    </div>
                  </div>
                  <div className="space-y-2.5 text-xs">
                    <div className="pb-2 border-b border-slate-700/50">
                      <span className="text-slate-400 font-medium block mb-1">Creator:</span>
                      <a
                        href={creatorUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-indigo-400 hover:text-indigo-300 hover:underline transition-colors block break-all font-mono text-xs leading-relaxed"
                      >
                        <span className="break-all inline-block">{blob.creator}</span>
                        <ExternalLink className="w-3 h-3 inline-block ml-1.5 align-middle" />
                      </a>
                    </div>
                    {blob.escrowId && (
                      <div className="pb-2 border-b border-slate-700/50">
                        <span className="text-slate-400 font-medium block mb-1">Escrow ID:</span>
                        <p className="text-slate-200 font-mono text-xs break-all leading-relaxed block">{blob.escrowId}</p>
                      </div>
                    )}
                    <div className="pb-2 border-b border-slate-700/50">
                      <span className="text-slate-400 font-medium block mb-1">Date:</span>
                      <p className="text-slate-200 block">{formatDate(blob.date)}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium block mb-1">Blobscan:</span>
                      <a
                        href={blob.blobscanLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-indigo-400 hover:text-indigo-300 hover:underline transition-colors inline-flex items-center gap-1.5"
                      >
                        View on Blobscan
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700 text-slate-400">
              <th className="text-left px-2 py-2 w-8"></th>
              <th className="text-left px-2 py-2">Creator</th>
              <th className="text-left px-2 py-2">Message</th>
              <th className="text-left px-2 py-2">Date</th>
              <th className="text-left px-2 py-2">Link</th>
            </tr>
          </thead>
          <tbody>
            {blobs.map((blob, idx) => {
              const isExpanded = expandedRows.has(idx);
              const creatorUrl = getExplorerUrl('address', blob.creator);
              const rowKey = blob.escrowId || `blob-${idx}`;

              return (
                <React.Fragment key={rowKey}>
                  <tr
                    className="border-b border-slate-800 hover:bg-slate-700/30 transition-colors duration-200 cursor-pointer"
                    onClick={() => toggleRow(idx)}
                  >
                    <td className="px-2 py-2 text-slate-400 w-8">
                      {isExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </td>
                    <td className="px-2 py-2 text-slate-300 whitespace-nowrap">
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
                    <td className="px-2 py-2 text-slate-200 max-w-xs">
                      <div className="line-clamp-2 break-words" title={blob.message}>
                        {blob.message}
                      </div>
                    </td>
                    <td className="px-2 py-2 text-slate-400 whitespace-nowrap text-xs">
                      {formatDateShort(blob.date)}
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap">
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
                      <td colSpan={5} className="p-4">
                        <div className="space-y-3">
                          <div>
                            <span className="text-slate-400 text-sm font-medium">Full Message:</span>
                            <div className="text-slate-200 mt-1 whitespace-pre-wrap break-words max-w-full overflow-wrap-anywhere p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                              {blob.message}
                            </div>
                          </div>
                          <div className="space-y-3 pt-2 border-t border-slate-700">
                            <div className="pb-2 border-b border-slate-700/50">
                              <span className="text-slate-400 text-sm font-medium block mb-1">Creator:</span>
                              <a
                                href={creatorUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-indigo-400 hover:text-indigo-300 hover:underline transition-colors duration-200 block break-all font-mono text-sm"
                              >
                                <span className="break-all">{blob.creator}</span>
                                <ExternalLink className="w-3.5 h-3.5 inline-block ml-1.5 align-middle" />
                              </a>
                            </div>
                            {blob.escrowId && (
                              <div className="pb-2 border-b border-slate-700/50">
                                <span className="text-slate-400 text-sm font-medium block mb-1">Escrow ID:</span>
                                <p className="text-slate-200 font-mono text-sm break-all block">{blob.escrowId}</p>
                              </div>
                            )}
                            <div className="pb-2 border-b border-slate-700/50">
                              <span className="text-slate-400 text-sm font-medium block mb-1">Date:</span>
                              <p className="text-slate-200 block">{formatDate(blob.date)}</p>
                            </div>
                            <div>
                              <span className="text-slate-400 text-sm font-medium block mb-1">Blobscan:</span>
                              <a
                                href={blob.blobscanLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-indigo-400 hover:text-indigo-300 hover:underline transition-colors duration-200 inline-flex items-center gap-1.5"
                              >
                                View on Blobscan
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
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
