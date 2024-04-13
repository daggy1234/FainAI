"use client";

import { ChakraProvider } from "@chakra-ui/react";
import type React from "react";

function Providers({ children }: { children: React.ReactNode }) {
  return <ChakraProvider>{children}</ChakraProvider>;
}

export default Providers;
