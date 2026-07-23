---
title: "From SNMP to gNMI: Why AI/GPU Infrastructure Is Killing the Old Network Management Playbook"
description: "For three decades SNMP has been the universal language of network monitoring. Then AI infrastructure arrived, and the polling model that worked for routers and switches turned out to be structurally blind to GPUs, RDMA fabrics, and the millisecond-scale events that make or break an AI training run."
pubDate: 2026-07-20
heroImage: "/SNMPtoGNMI.jpg"
---

Every network engineer of a certain vintage learned the same first lesson: when in doubt, snmpwalk it. For more than three decades, the Simple Network Management Protocol has been the closest thing telecom and enterprise networking has had to a universal language — a way to ask any router, switch, or server "how are you doing?" and get back a structured, predictable answer.

That universal language has a blind spot, and the blind spot has grown into a chasm. Point an SNMP poller at an NVIDIA H100 or B200 GPU accelerator and it will tell you nothing. Not the compute utilization, not the memory pressure, not the temperature, not whether the card is quietly throttling itself into uselessness. As AI infrastructure has moved from a niche cloud workload into a mainstream component of telecom data centers, edge sites, and private clouds, this blind spot has become one of the most consequential gaps in modern network operations.

This article traces why that gap exists, why the industry's answer has been a wholesale shift toward a different protocol family entirely, and what that shift means for anyone still running an SNMP-centric OSS stack.

## Why SNMP Was Never Going to Survive Contact With AI Infrastructure

SNMP's core design choice — a network management station periodically polling agents for the current value of a set of OIDs — was a reasonable engineering trade-off for the world it was built for. Router interface counters, routing protocol states, chassis temperatures: these are things that change on the order of seconds to minutes, and a poller checking in every thirty seconds to five minutes captures the shape of what is happening well enough for capacity planning and fault detection.

AI infrastructure does not behave on that timescale. A GPU's compute utilization can swing from idle to saturated within milliseconds as a training job launches a new kernel. A congestion event on an RDMA fabric can build and collapse in microseconds. Industry commentary on this mismatch has reached for motorsport analogies to make the point: monitoring a modern GPU fabric with a five-minute polling interval is a bit like trying to follow a Formula 1 race through a still photo taken once every lap — technically you have a record of where things stood, but the moment that actually mattered has long since passed by the time you look at it.

The events that actually determine whether an AI training run finishes on schedule or silently stalls for hours are exactly the events SNMP's polling cadence cannot see: a buffer microburst on a leaf switch, a Priority Flow Control pause frame propagating backward through a fabric, an NVLink error that degrades but doesn't kill a GPU-to-GPU link. None of these are things you can average over a five-minute window and still learn anything useful from.

## The Part Nobody Talks About: There's No MIB to Poll Even If You Wanted To

Even setting aside the polling-interval problem, there is a more basic issue: no Management Information Base exists for GPU accelerators in the first place. NVIDIA's own tooling illustrates the point. GPU telemetry is exposed through NVML, the NVIDIA Management Library, and consumed through nvidia-smi at the command line or through NVIDIA's Data Center GPU Manager for cluster-scale monitoring. DCGM is a genuinely capable piece of software — active health monitoring, diagnostics, power and clock governance, tight Kubernetes integration through a dedicated exporter — but it was built to feed Prometheus and time-series databases, not an SNMP-based Network Management Station. There is no SNMP interface anywhere in that stack, and no MIB defines what a GPU's compute utilization or ECC error count would even look like as an OID.

For an operator whose entire OSS toolchain — inventory, fault management, capacity planning — is built around SNMP polling, this creates a hard architectural seam. The routers and switches carrying traffic to and from a GPU cluster are fully visible. The GPUs themselves, and increasingly the interconnect fabric between them, are not. Two teams end up running two completely disconnected monitoring stacks for two halves of the same physical infrastructure, with no shared data model and no easy way to correlate a GPU fault against a concurrent network event.

## Enter gNMI: A Different Philosophy, Not Just a Different Protocol

The industry's answer has not been to patch SNMP but to route around it entirely. gNMI — the gRPC Network Management Interface, developed through the OpenConfig collaboration that began at Google and now spans essentially every major network vendor and hyperscaler — inverts SNMP's fundamental model. Where SNMP polls, gNMI subscribes: a client registers interest in a set of YANG-modelled data paths once, and the device then pushes updates continuously as state changes, over a persistent gRPC connection using Protocol Buffers rather than SNMP's ASN.1 encoding.

The practical effect of that inversion is large. A subscription-based stream can deliver updates at whatever cadence the underlying event actually occurs at, rather than at whatever cadence the poller happens to ask. gNMI's Subscribe RPC supports both a periodic streaming mode and an on-change mode, so a management system can ask for interface counters every second while also asking to be told immediately, with no polling delay, the moment an RDMA fabric's error counter increments.

gNMI's adoption is no longer a hyperscaler curiosity. OpenConfig-based gNMI streaming is now natively supported across Cisco, Juniper, Arista, and Nokia platforms, and network monitoring vendors have begun shipping unified platforms that speak SNMP, NetFlow, and gNMI/OpenConfig side by side rather than as separate silos. Arista has been candid about where the pressure is coming from: the same real-time telemetry infrastructure the company built into its EOS software stack for enterprise customers is now being extended specifically because, in the words of Arista's CEO, "our cloud customers and AI customers are seeking some of that visibility" into AI fabric behavior that older tooling simply could not provide.

## What Actually Breaks Without Streaming Telemetry: A Concrete Case

The abstract argument for streaming telemetry becomes concrete when you look at what happens inside a large-scale AI training cluster when the network underneath it misbehaves. Meta's public account of training Llama 3 across two 24,000-GPU clusters — one built on RDMA over Converged Ethernet, one on InfiniBand — is one of the most detailed public case studies available of this problem in production.

The RoCE cluster depends on Priority Flow Control to keep the fabric lossless, since RDMA has no retransmission mechanism to fall back on if a packet is dropped. The mechanics of PFC are coarser than they might sound: when a switch buffer starts to fill, it sends a pause instruction upstream for an entire traffic class, not for the specific flow that is actually causing the build-up. Innocent flows sharing that priority class get paused right along with the offending one. Published analysis of Meta's deployment describes exactly this pattern playing out at scale — a congestion event in one part of the fabric propagating backward and stalling traffic that had nothing to do with the original problem, degrading the throughput of an entire distributed training job without any single component ever reporting an outright failure.

This is precisely the class of event that a five-minute SNMP poll cannot catch and a GPU-only monitoring stack cannot explain, because the root cause sits in the network fabric rather than in the GPU itself. Catching it requires sub-second visibility into interconnect-level counters — exactly what gNMI's subscription model, rather than SNMP's polling model, is built to provide.

## The Broader Protocol Landscape: gNMI Didn't Arrive Alone

gNMI is easiest to understand in the context of the fuller evolution of network management protocols. Before it, NETCONF brought transactional, model-driven configuration using YANG data models over SSH — a genuine advance over SNMP for configuration management, but still fundamentally a request-response protocol rather than a streaming one. RESTCONF extended the same YANG-modelled data to a RESTful, HTTP-friendly interface aimed at DevOps toolchains that were never going to learn SNMP's MIB syntax. gNMI, and its sibling protocols gNOI (for operational commands like reboot and file transfer) and gRIBI (for direct manipulation of routing information), completed the shift by adding the piece none of the earlier protocols solved: efficient, vendor-neutral, model-driven streaming.

The transport layer matters as much as the data model here. gNMI's use of gRPC over HTTP/2 with Protocol Buffer encoding is dramatically more efficient on the wire than SNMP's per-object polling, and — unlike SNMP's traditional reliance on unauthenticated or weakly authenticated community strings — gNMI sessions are TLS-encrypted by default, which matters considerably more once the data flowing across that channel includes real-time visibility into a customer's AI workload performance.

## SNMP Is Not Dead — It Is Being Correctly Scoped

None of this means SNMP is obsolete or that operators should rip it out. The honest technical position, and the one most experienced practitioners converge on, is that SNMP remains entirely appropriate for the class of data it was designed for: physical inventory, configuration snapshots, routing adjacency state, anything that genuinely is slow-changing and where a periodic snapshot loses little by not being continuous. What has changed is the recognition that this is no longer the only class of data an operator needs to collect, and that trying to force microsecond-scale AI fabric events through a protocol built for five-minute polling cycles is a category error, not a tuning problem.

The pragmatic path most operators are converging on is coexistence rather than replacement: SNMP continues to serve the OSS/BSS estate it has always served, while gNMI-based streaming telemetry is layered in specifically for the workloads — AI clusters, high-speed optical transport, anything where sub-second visibility has genuine operational value — where polling was always going to be the wrong tool for the job.

## What This Means for Telecom Operators Building AI-Native Infrastructure

For telecom operators, the practical implication is a widening gap between two toolchains that were, until recently, largely separate concerns. Network operations teams have spent decades building SNMP-centric OSS platforms, inventory systems, and fault-correlation workflows. AI operations teams monitoring GPU clusters are building on an entirely different foundation — DCGM exporters feeding Prometheus, gNMI feeding time-series databases, dashboards in Grafana — with no shared data model connecting the two.

As operators deploy AI-enhanced Radio Access Networks, edge inference platforms, and AI-driven core network functions, that separation stops being a tolerable inefficiency and starts being an operational risk. A GPU thermal event degrading inference latency for a real-time network automation function, or a RoCE congestion cascade silently inflating job completion time for an AI-based RAN optimization model, is invisible to a network operations center still watching only SNMP-fed dashboards. The tooling gap becomes a visibility gap, and the visibility gap becomes an incident nobody saw coming until a customer complained.

Closing that gap is going to require operators to do two things simultaneously: extend streaming telemetry adoption into the parts of the network that touch AI infrastructure, and find a way to bring the resulting data back into the unified operational picture that OSS platforms exist to provide. Neither of those is a solved problem yet. But the direction of travel is no longer in question — the industry has already decided that the protocol built in 1988 for polling router interface counters is not the protocol that is going to manage 2026's AI-scale fabrics, and every major vendor's roadmap now reflects that decision.

---

*Saurabh Pant is a telecom and digital infrastructure leader based in Denver, Colorado, with over 20 years of experience in OSS/BSS transformation, network inventory strategy, and 5G platform architecture across the US, UK, and Asia-Pacific.*
