/**
 * Copyright 2024 Shinami Corp.
 * SPDX-License-Identifier: Apache-2.0
 */

// Flow:
// 1. Choose a character
// 2. Retrieve a mint ticket for the character
//    2a. useParsedSuiOwnedObjects()
//    2b. If non-existing, useNewMintTicket()
// 3. Allocate attribute points
// 4. Upon submit, useMintHero() and navigate to /

import Canvas from "@/lib/components/Canvas";
import { AttributePoints, Divider, HeroCard } from "@/lib/components/Elements";
import { Carousel } from "@/lib/components/carousel";
import { useMintHero, useNewMintTicket } from "@/lib/hooks/api";
import { useParsedSuiOwnedObjects } from "@/lib/hooks/sui";
import { MINT_TICKET_MOVE_TYPE, MintTicket } from "@/lib/shared/hero";
import { AuthContext } from "@/lib/shared/zklogin";
import {
  Box,
  Button,
  Link as ChakraLink,
  Flex,
  FormControl,
  FormErrorMessage,
  HStack,
  Heading,
  Image,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalOverlay,
  ScaleFade,
  VStack,
  useDisclosure,
} from "@chakra-ui/react";
import {
  ZkLoginSessionActive,
  withZkLoginSessionRequired,
} from "@shinami/nextjs-zklogin/client";
import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { ZkLoginLoading, ZkLoginRedirecting } from "../auth/login";

const characterAttrs = {
  0: { damage: 3, speed: 4, defense: 3 },
  1: { damage: 2, speed: 7, defense: 1 },
  2: { damage: 5, speed: 1, defense: 4 },
};

enum Hero {
  FIGHTER = 0,
  ROGUE = 1,
  WARRIOR = 2,
}

const NewHero = ({
  session,
}: {
  session: ZkLoginSessionActive<AuthContext>;
}) => {
  const { user, localSession } = session;
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [hero, setHero] = useState<Hero>(Hero.FIGHTER);
  const [heroName, setHeroName] = useState<string>();
  const [chosenTickets, setChosenTickets] = useState<{
    [n: number]: MintTicket;
  }>({});
  const { data: mintTickets } = useParsedSuiOwnedObjects(
    user.wallet,
    MINT_TICKET_MOVE_TYPE,
    MintTicket
  );
  const { mutateAsync: newMintTicket, isPending: newMintTicketPending } =
    useNewMintTicket();
  const {
    mutateAsync: mintHero,
    isPending: mintHeroLoading,
    isSuccess: mintHeroIsSuccess,
    isError: mintHeroIsError,
  } = useMintHero();

  const getTicket = useCallback(
    (hero: Hero) => {
      if (!mintTickets) {
        setChosenTickets({});
        return;
      }
      if (
        !chosenTickets[hero] ||
        !mintTickets.some((x) => x.id.id === chosenTickets[hero].id.id)
      ) {
        const ticket = mintTickets.find((ticket) => ticket.character === hero);

        if (ticket) {
          setChosenTickets((tickets) => ({ ...tickets, [hero]: ticket }));
        } else if (!newMintTicketPending && !isOpen) {
          newMintTicket({ character: hero }).then((ticket) => {
            setChosenTickets((tickets) => ({ ...tickets, [hero]: ticket }));
          });
        }
      }
    },
    [mintTickets, newMintTicket, chosenTickets, isOpen, newMintTicketPending]
  );

  useEffect(() => {
    if (!mintTickets) {
      setChosenTickets({});
      return;
    }
    getTicket(hero);
  }, [mintTickets, hero, getTicket]);

  const nextHero = useCallback(() => {
    const next = (hero + 1) % 3;
    setHero((prev) => (prev + 1) % 3);
    getTicket(next);
  }, [hero, getTicket]);

  const prevHero = useCallback(() => {
    const previous = (((hero - 1) % 3) + 3) % 3;
    setHero((prev) => (((prev - 1) % 3) + 3) % 3);
    getTicket(previous);
  }, [hero, getTicket]);

  const handleSubmit = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      if (chosenTickets[hero] && heroName) {
        mintHero({
          name: heroName,
          damage: characterAttrs[hero as keyof typeof characterAttrs].damage,
          speed: characterAttrs[hero as keyof typeof characterAttrs].speed,
          defense: characterAttrs[hero as keyof typeof characterAttrs].defense,
          ticketId: chosenTickets[hero].id.id,
          keyPair: localSession.ephemeralKeyPair,
        });

        setHeroName(undefined);
        onOpen();
      }
    },
    [
      mintHero,
      onOpen,
      chosenTickets,
      hero,
      heroName,
      localSession.ephemeralKeyPair,
    ]
  );

  return (
    <Canvas user={user} image="/home-bg.jpg">
      <Flex flexDir="column" align="center">
        <VStack gap="30px">
          <Heading size="3xl">Select your Hero</Heading>

          <HStack gap="30px">
            <ChakraLink onClick={prevHero}>
              <Image
                style={{
                  transition: "all 0.2s ease",
                }}
                _hover={{
                  transform: "scale(1.03)",
                  opacity: "1.0",
                }}
                _active={{
                  transform: "scale(0.95)",
                }}
                src="/left-arrow.png"
                alt="left arrow"
                opacity={0.7}
                scale={0.95}
              />
            </ChakraLink>
            <ScaleFade
              initialScale={0.95}
              transition={{ enter: { duration: 1 } }}
              in
            >
              <Box width="700px" height="350px">
                <Carousel
                  goToSlide={hero}
                  slides={[
                    {
                      key: 1,
                      content: <HeroCard name="Fighter" character={0} />,
                      onClick: () => setHero(Hero.FIGHTER),
                    },
                    {
                      key: 2,
                      content: <HeroCard name="Rogue" character={1} />,
                      onClick: () => setHero(Hero.ROGUE),
                    },
                    {
                      key: 3,
                      content: <HeroCard name="Warrior" character={2} />,
                      onClick: () => setHero(Hero.WARRIOR),
                    },
                  ]}
                  animationConfig={{ tension: 220, friction: 25 }}
                  offsetRadius={2}
                />
              </Box>
            </ScaleFade>
            <ChakraLink onClick={nextHero}>
              <Image
                style={{
                  transition: "all 0.2s ease",
                }}
                _hover={{
                  transform: "scale(1.03)",
                  opacity: "1.0",
                }}
                _active={{
                  transform: "scale(0.95)",
                }}
                src="/right-arrow.png"
                alt="right arrow"
                opacity={0.7}
                scale={0.95}
              />
            </ChakraLink>
          </HStack>
          <HStack gap="30px">
            <HStack>
              <Heading size="lg">Damage: </Heading>
              <AttributePoints
                count={
                  characterAttrs[hero as keyof typeof characterAttrs].damage
                }
              />
            </HStack>
            <HStack>
              <Heading size="lg">Speed:</Heading>
              <AttributePoints
                count={
                  characterAttrs[hero as keyof typeof characterAttrs].speed
                }
              />
            </HStack>
            <HStack>
              <Heading size="lg">Defense:</Heading>
              <AttributePoints
                count={
                  characterAttrs[hero as keyof typeof characterAttrs].defense
                }
              />
            </HStack>
          </HStack>
        </VStack>

        <VStack width="1028px" gap="30px" mt="50px">
          <Divider />

          <form action="" onSubmit={handleSubmit}>
            <Flex gap={4}>
              <FormControl isRequired mb="22px">
                <Input
                  textAlign="center"
                  type="text"
                  value={heroName || ""}
                  autoComplete="off"
                  onChange={(e) => setHeroName(e.target.value)}
                  _hover={{
                    border: "2px #FFF solid",
                    boxShadow: "0px 0px 10px rgba(255, 255, 255, 0.45)",
                  }}
                  _focus={{
                    border: "2px #FFF solid",
                    boxShadow: "0px 0px 10px rgba(255, 255, 255, 0.45)",
                  }}
                  _placeholder={{ color: "#aaa" }}
                  border={"2px #FFF solid"}
                  py="26px"
                  placeholder="Enter hero name"
                  fontFamily="var(--font-irishGrover)"
                  fontSize="3xl"
                  transform="skew(-10deg)"
                />
                <FormErrorMessage>Hero name is required</FormErrorMessage>
              </FormControl>
              <Button
                type="submit"
                variant="solid"
                isDisabled={!chosenTickets[hero]}
                isLoading={newMintTicketPending}
                minW="200px"
              >
                <Box transform="skew(10deg)">Let&apos;s go!</Box>
              </Button>
            </Flex>
          </form>
        </VStack>
      </Flex>
      <Box pos="absolute" bottom="3rem" left="3rem">
        <Link href="/">
          <Button paddingInlineStart={0} minW="none" variant="ghost">
            Go back
          </Button>
        </Link>
      </Box>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        closeOnOverlayClick={false}
        isCentered
        size="2xl"
      >
        <ModalOverlay background="#000000e6" />
        <ModalContent
          py="55px"
          display="flex"
          flexDir="column"
          alignItems="center"
          justifyContent="center"
          backgroundImage="/mint-hero-bg.jpg"
          backgroundPosition="bottom"
          backgroundSize="cover"
          width="700px"
          height="600px"
          border="1px solid #9b9b9b"
          boxShadow="0px 0px 30px #ff880078"
        >
          <ModalBody
            width="300px"
            display="flex"
            flexDir="column"
            gap="32px"
            alignItems="center"
            justifyContent="center"
          >
            {mintHeroLoading && (
              <>
                <Image src="/spinner.svg" alt="spinner" />
                <Heading textAlign="center" size="3xl">
                  Minting hero
                </Heading>
              </>
            )}
            {mintHeroIsSuccess && (
              <>
                <ScaleFade
                  initialScale={0.95}
                  transition={{ enter: { duration: 1 } }}
                  in
                >
                  <Heading mb="22px" textAlign="center" size="3xl">
                    A hero is born!
                  </Heading>
                  <Link href="/">
                    <Button>Let&apos;s make history</Button>
                  </Link>
                </ScaleFade>
              </>
            )}
            {mintHeroIsError && (
              <>
                <Heading textAlign="center" size="3xl">
                  Error creating hero
                </Heading>
                <Button onClick={onClose}>Go back</Button>
              </>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </Canvas>
  );
};

export default withZkLoginSessionRequired(
  NewHero,
  ZkLoginLoading,
  ZkLoginRedirecting
);
