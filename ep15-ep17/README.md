# Modularised launch fleets script

## Overview
The code in this directory is an alternative to the launch-fleets.js script. It splits
launch-fleet's logic into multiple services that communicate with each other through a
queuing service channel.

## Components

| Component | Purpose |
|:----------|:--------------|
|Queue Service| The communication channel that all services subscribe to for sending events through ports |
|Book Keeper| The component responsible for managing and determining the list of available ships |
|Strategist| The component responsible for analysing the network for targets and determining the requirements for all targets |
|Warmonger| The component responsible for launching attacks (wars) to other servers based on instructions from the captain |
|Captain| Coordinates all components together and runs all services in one go |

## Episodes released

- Episode 15 - High level plan + book keeper implementation
- Episode 16 - Warmonger + Strategist implementation
- Episode 17 - Captain implementation

## Advantages
- Can now query data from other services in different scripts without increasing memory for importing NS functions
- Logic are encapsulated - meaning that if something's wrong with a component, you can isolate and debug the issue directly
- Game loads a lot faster for me now

## Limitations
- The delay and timing must be tweaked to support the load being handled by queue service. 
- Queue service has limited capacity
- Income generated only when player is online (problem present in launch-fleets too)
