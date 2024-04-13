/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-ts-comment */

"use client";

import {
  Text,
  Box,
  Heading,
  Flex,
  Link,
  OrderedList,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Spacer,
  Textarea,
  Button,
  Avatar,
  ListItem,
} from "@chakra-ui/react";
import ChakraUIRenderer from "chakra-ui-markdown-renderer";
import React from "react";
import Markdown from "react-markdown";

import chatComplete from "./action";

export default function Home() {
  const [chatHistory, setChatHistory] = React.useState([]);
  const [currQ, setCurrQ] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [currSources, SetCurSources] = React.useState([]);
  const chatEndRef = React.useRef(null);

  const scrollToBottom = () => {
    // @ts-ignore
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Modal Title</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <OrderedList>
              {currSources.map((source: any) => (
                <ListItem>
                  {source.image ? (
                    <Text>
                      Image: <Link href={source.image}>{source.image}</Link>
                    </Text>
                  ) : (
                    <Text>
                      Textbook:{" "}
                      <Link
                        href={`https://jeffe.cs.illinois.edu/teaching/algorithms/book/Algorithms-JeffE.pdf#page=${source.page}`}
                      >
                        Algorithims#{source.page}
                      </Link>
                    </Text>
                  )}
                </ListItem>
              ))}
            </OrderedList>
          </ModalBody>

          <ModalFooter>
            <Button colorScheme="blue" mr={3} onClick={onClose}>
              Close
            </Button>
            <Button variant="ghost">Secondary Action</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
      <Box mx="auto" p={8}>
        <Flex h="90vh" direction="column">
          <Heading as="h1" size="2xl" textAlign="center">
            FainAI
          </Heading>
          <Spacer />
          <Flex overflowY="scroll" direction="column">
            {chatHistory.map((chat: any) => (
              <Box
                p={2}
                bg={chat.role === "ai" ? "white" : "gray.100"}
                key={chat.content}
              >
                <Flex alignItems="center">
                  <Avatar size="xs" name={chat.role} />
                  <Text ml={2} fontWeight="bold">
                    {chat.role}
                  </Text>
                  {chat.role === "ai" && (
                    <>
                      <Spacer />
                      <Button
                        onClick={() => {
                          // let pretty_string = "";
                          // chat.sources.forEach((source: any) => {
                          //   if (source.image) {
                          //     pretty_string += `Image: ${source.image}\n`;
                          //   } else {
                          //     pretty_string += `Textbook: https://jeffe.cs.illinois.edu/teaching/algorithms/book/Algorithms-JeffE.pdf#page=${source.page}\n`;
                          //   }
                          // });
                          // alert(pretty_string);
                          SetCurSources(chat.sources);
                          onOpen();
                        }}
                        size="xs"
                        colorScheme="blue"
                      >
                        Sources
                      </Button>
                    </>
                  )}
                </Flex>
                <Markdown components={ChakraUIRenderer()} skipHtml>
                  {chat.content}
                </Markdown>
              </Box>
            ))}
            <Box ref={chatEndRef} />
          </Flex>
          <Flex>
            <Textarea
              value={currQ}
              onChange={(e) => {
                setCurrQ(e.target.value);
              }}
            />
            <Button
              isLoading={isLoading}
              onClick={async () => {
                setIsLoading(true);
                const response = await chatComplete(currQ, chatHistory);
                setChatHistory(response.chat_history);
                setIsLoading(false);
                setCurrQ("");
                scrollToBottom();
              }}
              size="lg"
              colorScheme="blue"
            >
              Send
            </Button>
          </Flex>
        </Flex>
      </Box>
    </>
  );
}
