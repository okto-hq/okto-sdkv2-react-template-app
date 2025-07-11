import React, { useContext, useState } from "react";
import packageJson from "../../package.json";
import { Github } from "lucide-react";
import { ConfigContext } from "../context/ConfigContext";

const Navbar = () => {
  const { config } = useContext(ConfigContext);
  const mode = config.mode;
  return (
    <nav className="bg-gray-700 text-white p-4 shadow-md">
      <div className="container mx-auto grid grid-cols-1 md:grid-cols-3 ">
        <div className="text-xl font-bold">
          <img src="/icon.svg" className="w-10 h-10" />
        </div>
        <div className="text-lg font-semibold flex items-center md:justify-center gap-3">
          Okto React SDK Demo
          <span className="px-2 py-1 text-xs font-medium bg-gray-600 text-gray-200 rounded-full border border-gray-500">
            v{packageJson.dependencies["@okto_web3/react-sdk"]}
          </span>
          {mode && (
            <span className="px-2 py-1 text-xs font-medium bg-gray-600 text-gray-200 rounded-full border border-gray-500">
              {mode.toUpperCase()}
            </span>
          )}
        </div>
        <a
          href="https://github.com/okto-hq/okto-sdkv2-react-template-app"
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-300 hover:text-white transition-colors mr-4 flex items-center gap-2 md:ml-auto"
        >
          <Github size={20} />
          <span className="text-sm">Template App Source Code</span>
        </a>
      </div>
    </nav>
  );
};

export default Navbar;
