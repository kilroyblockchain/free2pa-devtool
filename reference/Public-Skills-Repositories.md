# Public Skills Repositories and Prompt Libraries

Last reviewed: 2026-02-17

This guide helps students find public, provider-backed examples they can test before building their own skills.

## How to Use This List
1. Pick one provider resource.
2. Find one example relevant to your scenario.
3. Run a small test with your own input.
4. Document what worked and what failed.
5. Adapt the pattern into your own team skill (do not copy blindly).

## Provider Resources

| Provider | Public Resource | Type | What Students Can Reuse | Access Notes |
|---|---|---|---|---|
| OpenAI | https://chatgpt.com/gpts | GPT directory / skill-style assistants | role setup ideas, instruction style, capability boundaries | Requires compatible ChatGPT plan for full use |
| OpenAI | https://github.com/openai/openai-cookbook | Official code recipes | tool calling patterns, evaluation loops, structured outputs | Public GitHub repo |
| OpenAI | https://platform.openai.com/docs/actions/actions-library/middleware-actions-cookbook | Action patterns | external action integration patterns, middleware design | OpenAI platform docs |
| Anthropic | https://docs.anthropic.com/claude/prompt-library | Prompt/skill library | reusable task prompt patterns and instruction structure | Public docs |
| Anthropic | https://github.com/anthropics/anthropic-cookbook | Official Claude recipes | prompt engineering, tool-use patterns, RAG examples | Public GitHub repo |
| Google (Gemini) | https://ai.google.dev/prompt-gallery | Prompt gallery | API-ready prompt examples by task type | Public docs |
| Google (Gemini) | https://github.com/google-gemini/cookbook | Official Gemini cookbook | end-to-end examples and quickstarts | Public GitHub repo |
| Google (Gemini) | https://blog.google/products/gemini/sharing-gems/ | Gems sharing guide | shared custom-assistant ideas for team workflows | Gems usage depends on Gemini account/workspace setup |
| Microsoft | https://learn.microsoft.com/en-us/copilot/microsoft-365/copilot-prompt-gallery | Prompt Gallery overview | team prompt sharing patterns and prompt framing | Feature depends on Microsoft 365 Copilot access |
| Microsoft | https://learn.microsoft.com/en-us/microsoft-copilot-studio/prompt-library | Prompt template library | template-first prompt building patterns | Copilot Studio / Power Platform environment needed |
| Meta (Llama) | https://github.com/meta-llama/llama-cookbook | Official Llama cookbook | practical task recipes and integration examples | Public GitHub repo |
| Mistral | https://docs.mistral.ai/cookbooks/ | Official cookbook hub | agent, function-calling, MCP, and eval examples | Public docs |
| Mistral | https://github.com/mistralai/cookbook | Official cookbook repo | runnable notebooks and skill-like workflows | Public GitHub repo |
| xAI | https://github.com/xai-org/grok-prompts | Public prompt repository | system prompt structure and behavior constraints | Public GitHub repo |
| Cohere | https://docs.cohere.com/docs/tool-use-overview | Tool-use guide | tool schema patterns and agentic workflows | Public docs |
| Cohere | https://docs.cohere.com/v2/docs/tool-use-quickstart | Tool-use quickstart | starter implementation patterns for tools/agents | Public docs |

## Bonus (Cross-Provider, MCP-Centric)

| Resource | Link | Why It Matters |
|---|---|---|
| MCP official org | https://github.com/modelcontextprotocol | protocol and SDK ecosystem used across model stacks |
| MCP maintained servers list | https://github.com/modelcontextprotocol/servers | reference servers teams can evaluate and adapt safely |

## Student Skill Scouting Checklist
Use this checklist before adopting anything from an external library.

- [ ] Is the source official or well maintained?
- [ ] Is it relevant to our business scenario?
- [ ] Do we understand inputs and outputs?
- [ ] Do we understand failure modes?
- [ ] Are escalation triggers defined?
- [ ] Are security boundaries clear?
- [ ] Is the license acceptable for classroom reuse?
- [ ] Did we adapt it to our role instead of copying as-is?

## Required Attribution Practice
When students borrow an idea, they must log:
- source URL
- date reviewed
- what they reused
- what they changed
- how they tested it

Suggested location: weekly submission and skill change summary.

## Warning About Drift
Provider examples evolve frequently. Students must verify links and behavior each week before assuming old examples are still valid.
