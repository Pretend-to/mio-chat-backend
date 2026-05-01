---
name: skill-manager
description: Manage the Agent's skill library. Use this to discover, install, and organize skills that extend your capabilities.
version: 1.0.0
author: Mio-Chat
---

# Skill Management Guide

You have the ability to expand your own capabilities by installing new "Skills" from the community or specialized repositories.

## When to use this skill
- When the user asks you to learn a new ability (e.g., "Learn how to use AWS").
- When you identify a task that could be better handled by a specialized skill found on GitHub or [skills.sh](https://skills.sh).
- When you need to organize or list your current expert capabilities.

## How to Install a New Skill
1. **Identify the Source**: Find a GitHub repository that follows the Agent Skills standard (contains a `SKILL.md`).
2. **Call the Install Tool**: Use `InstallSkill(repo_url="...")` to clone the skill into your library.
3. **Verify Installation**: After the tool returns success, the new skill is automatically added to your catalog.
4. **Load the New Skill**: If the user wants you to use it immediately, call `Skill(skill_name="...")` to read the new instructions.

## Best Practices
- **Respect User Intent**: Always inform the user before installing a new skill unless they explicitly asked you to "install" or "learn" it.
- **Progressive Discovery**: If you aren't sure which skill is best, you can search GitHub first using your search tools.
- **Verification**: After installing, it's good practice to briefly explain to the user what new capabilities you've just acquired.

## Example Workflow
User: "You should learn the Kubernetes skill from anthropics/skills."
Agent: (Calls `InstallSkill(repo_url="anthropics/skills", skill_folder_name="k8s")`)
Agent: "I've successfully learned the Kubernetes skill! I can now help you manage clusters, deploy pods, and troubleshoot K8s environments."
