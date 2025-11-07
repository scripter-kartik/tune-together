import React from "react";
import { SignInButton } from "@clerk/nextjs";

const InviteFriend = () => {
  return (
    <div className="w-full h-full bg-[#121212]">
      {/* Header */}
      <div className="flex items-center px-3 py-4 justify-start gap-4 border-b border-gray-800">
        <img className="w-5 h-5" src="/users.png" alt="" />
        <h1 className="font-bold text-sm">What they're listening to</h1>
      </div>
      {/* Main Content */}
      <div className="flex flex-col gap-10 justify-center items-center text-center h-full w-full p-14">
        <div className="relative">
          <div
            className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-sky-500 
            rounded-full blur-lg opacity-75 animate-pulse"
            aria-hidden="true"
          ></div>

          <div className="relative bg-zinc-900 rounded-full p-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="lucide lucide-headphones text-emerald-400"
            >
              <path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3"></path>
            </svg>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <h1 className="font-bold text-lg">See What Friends Are Playing</h1>
          <p className="text-xs text-gray-400">
            Login to discover what music your friends are enjoying right now
          </p>
          <SignInButton mode="modal">
            <div className="flex items-center justify-center gap-1">
              <p className="text-green-400 text-[13px] hover:underline cursor-pointer">login</p>
            </div>
          </SignInButton>
        </div>
      </div>
    </div>
  );
};

export default InviteFriend;
