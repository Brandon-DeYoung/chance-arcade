"use client";

import { useState } from "react";
import { displayName, initials, type Member } from "./members";

export const COLORS = ["#ff5a78","#ff934c","#f6c84f","#8bd06c","#25bfb1","#388ce8","#7664e8","#bd61de"];

export function Profile({ member, className = "" }: { member: Member; className?: string }) {
  const [failed, setFailed] = useState(false);
  return <span className={`profile ${className}`} aria-label={displayName(member)}>{member.image && !failed
    ? <img src={member.image} alt="" onError={() => setFailed(true)} />
    : <b>{initials(displayName(member))}</b>}</span>;
}
