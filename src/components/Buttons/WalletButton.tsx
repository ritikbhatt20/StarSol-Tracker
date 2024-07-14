// components/WalletButton.tsx
import React from "react";
import {
  useWallet,
  Wallet as SolanaWallet,
  WalletNotSelectedError,
} from "@solana/wallet-adapter-react";
import { ChevronDownIcon } from "@chakra-ui/icons";
import {
  Box,
  Button,
  Flex,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Text,
} from "@chakra-ui/react";
import { useWalletStore } from "@/utils/zustand";
import { truncatedPublicKey } from "@/utils/helper";

const WalletButton = () => {
  const { wallets, select, connect, disconnect, connected, publicKey, wallet } =
    useWallet();
  const setPublicKey = useWalletStore((state) => state.setPublicKey);

  const onSelectWallet = async (wallet: SolanaWallet) => {
    try {
      console.log("Selecting wallet:", wallet.adapter.name);
      await select(wallet.adapter.name);
      console.log("Connecting wallet...");
      await connect();
      console.log(
        "Wallet connected:",
        publicKey ? publicKey.toBase58() : "undefined"
      );
      if (publicKey) {
        setPublicKey(publicKey.toBase58());
      }
    } catch (error) {
      if (error instanceof WalletNotSelectedError) {
        console.warn("Wallet is not selected.");
      } else {
        console.error("Wallet Error:", error);
      }
    }
  };

  const onDisconnectWallet = async () => {
    try {
      console.log("Disconnecting wallet...");
      await disconnect();
      setPublicKey(null); // Clear the public key in Zustand store
      console.log("Wallet disconnected");
    } catch (e) {
      console.error("Wallet Error: ", e);
    }
  };

  return (
    <Menu>
      <MenuButton
        as={Button}
        className="w-1/2 flex justify-center items-center text-center text-blue-500 hover:text-green-500"
        rightIcon={
          connected && wallet ? (
            <Box h="1.5rem" w="1.5rem" mr="1rem">
              <img
                src={wallet.adapter.icon}
                alt={`${wallet.adapter.name} Icon`}
              />
            </Box>
          ) : (
            <ChevronDownIcon color="white" w="1.5rem" h="1.5rem" />
          )
        }
      >
        {connected && publicKey
          ? `Connected: ${truncatedPublicKey(publicKey.toBase58())}`
          : "Connect to Wallet"}
      </MenuButton>
      <MenuList backgroundColor={"#040112"} p={12} border={4}>
        {connected && (
          <MenuItem onClick={onDisconnectWallet}>
            <Text fontSize="1.2rem" ml={2} fontWeight={600} color="red.500">
              Disconnect Wallet
            </Text>
          </MenuItem>
        )}
        {wallets.map((wallet: SolanaWallet) => (
          <MenuItem
            key={wallet.adapter.name}
            onClick={() => onSelectWallet(wallet)}
            border={4}
          >
            <Flex py={10} px={4}>
              <Box w="2rem" h="2rem" mr="1rem">
                <img
                  width={100}
                  loading="lazy"
                  src={wallet.adapter.icon}
                  alt={`${wallet.adapter.name} Icon`}
                />
              </Box>
              <Text fontSize="1.2rem" ml={2} fontWeight={600} color="blue.100">
                {wallet.adapter.name}
              </Text>
            </Flex>
          </MenuItem>
        ))}
      </MenuList>
    </Menu>
  );
};

export default WalletButton;
