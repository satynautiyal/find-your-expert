'use client';

import React, { useState } from 'react';
import { ArrowRight, ChevronUp } from 'lucide-react';
import type { RooferProvider, ProviderTeamMemberItem } from '@/data/mockRoofers';
import { getMediaUrl } from '@/lib/media-url';

interface ProfileTeamSectionProps {
  provider: RooferProvider;
}

function getInitials(name: string): string {
  const parts = (name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return 'TM';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function TeamMemberRow({ member }: { member: ProviderTeamMemberItem }) {
  const [imgFailed, setImgFailed] = useState(false);
  const [expandedBio, setExpandedBio] = useState(false);

  const resolvedPhoto = member.photoUrl ? getMediaUrl(member.photoUrl) : '';
  const showPhoto = Boolean(resolvedPhoto) && !imgFailed;
  const hasBio = Boolean(member.bio && member.bio.trim().length > 0);

  return (
    <div className="py-3.5 sm:py-4 transition-colors">
      <div className="flex items-start sm:items-center justify-between gap-3.5 sm:gap-4">
        {/* Left: Circular R2 Portrait or Clean Initials */}
        <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full overflow-hidden border border-gray-200/90 bg-slate-100 flex items-center justify-center shrink-0">
          {showPhoto ? (
            <img
              src={resolvedPhoto}
              alt={member.name}
              loading="lazy"
              onError={() => setImgFailed(true)}
              className="w-full h-full object-cover object-top"
            />
          ) : (
            <span className="text-xs sm:text-sm font-bold text-slate-600 tracking-tight select-none">
              {getInitials(member.name)}
            </span>
          )}
        </div>

        {/* Center: Name, Credentials, Role & Bio Preview */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
            <h3 className="text-sm sm:text-[15px] font-bold text-gray-950 leading-snug">
              {member.name}
            </h3>
            {member.credentials && (
              <span className="text-xs sm:text-[13px] font-medium text-gray-600">
                {member.credentials}
              </span>
            )}
            {member.role && (
              <span className="text-xs sm:text-[13px] text-gray-500 font-medium">
                · {member.role}
              </span>
            )}
          </div>

          {hasBio && (
            <p
              className={`text-xs sm:text-[13px] text-gray-600 leading-relaxed mt-1 ${
                expandedBio ? '' : 'line-clamp-1'
              }`}
            >
              {member.bio}
            </p>
          )}
        </div>

        {/* Right: Profile / Bio Expand Action */}
        {hasBio && (
          <button
            type="button"
            onClick={() => setExpandedBio((prev) => !prev)}
            className="inline-flex items-center gap-1 text-xs sm:text-[13px] font-semibold text-[#134e4a] hover:text-primary transition-colors shrink-0 pt-1 sm:pt-0 cursor-pointer"
          >
            {expandedBio ? (
              <>
                <span>Less</span>
                <ChevronUp className="w-3.5 h-3.5" />
              </>
            ) : (
              <>
                <span>Profile</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

export default function ProfileTeamSection({ provider }: ProfileTeamSectionProps) {
  const [showAll, setShowAll] = useState(false);

  const teamMembers = provider.teamMembers || [];
  if (teamMembers.length === 0) {
    return null;
  }

  const INITIAL_VISIBLE = 4;
  const visibleMembers = showAll ? teamMembers : teamMembers.slice(0, INITIAL_VISIBLE);
  const hasMore = teamMembers.length > INITIAL_VISIBLE;

  return (
    <section
      id="team"
      className="bg-white rounded-2xl border border-gray-300/85 p-5 sm:p-6 shadow-[0_8px_28px_-4px_rgba(15,23,42,0.11),0_4px_10px_-2px_rgba(15,23,42,0.06)] scroll-mt-36"
    >
      {/* Header matching reference design */}
      <div className="mb-3.5">
        <h2 className="text-xl sm:text-2xl font-black text-gray-950 tracking-tight">
          The team
        </h2>
        <p className="text-xs sm:text-sm text-gray-500 mt-0.5 font-medium">
          {teamMembers.length} {teamMembers.length === 1 ? 'team member' : 'team members'}
        </p>
      </div>

      {/* Clean Horizontal Divider List */}
      <div className="divide-y divide-gray-200/80 border-t border-b border-gray-200/80">
        {visibleMembers.map((member) => (
          <TeamMemberRow key={member.id || member.name} member={member} />
        ))}
      </div>

      {/* Expand / Collapse All Link */}
      {hasMore && (
        <div className="pt-3.5">
          <button
            type="button"
            onClick={() => setShowAll((prev) => !prev)}
            className="text-xs sm:text-[13px] font-bold text-gray-900 underline underline-offset-4 decoration-gray-400 hover:decoration-gray-950 transition-colors cursor-pointer"
          >
            {showAll
              ? 'Show fewer team members'
              : `See all ${teamMembers.length} team members`}
          </button>
        </div>
      )}
    </section>
  );
}

