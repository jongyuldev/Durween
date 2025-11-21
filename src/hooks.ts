import { Octokit } from "@octokit/rest";
import { WebClient } from "@slack/web-api";
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env from project root
// dotenv.config({ path: path.resolve(__dirname, '../.env') });

let octokit: Octokit;
let slackClient: WebClient;

function initClients() {
    if (octokit && slackClient) return;

    try {
        dotenv.config({ path: path.resolve(__dirname, '../.env') });
    } catch (e) {
        console.error("Failed to load .env", e);
    }

    const SLACK_TOKEN = process.env.SLACK_TOKEN;
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

    octokit = new Octokit({ auth: GITHUB_TOKEN });
    slackClient = new WebClient(SLACK_TOKEN);
}

const GITHUB_OWNER = 'jongyuldev';
const GITHUB_REPO = 'Durween';

export async function checkSlackForContext(currentFileName: string): Promise<string | null> {
    initClients();
    try {
        // 1. Search Slack messages for the file name
        const result = await slackClient.search.messages({
            query: `in:#general ${currentFileName}`,
            sort: "timestamp",
            sort_dir: "desc",
        });

        if (!result.messages || !result.messages.matches || result.messages.matches.length === 0) {
            return `I searched Slack for "${currentFileName}" but didn't find any recent chat.`;
        }

        // 2. Get the most relevant message
        const mostRelevantMessage = result.messages.matches[0];
        const text = mostRelevantMessage.text;
        const author = mostRelevantMessage.username;
        const permalink = mostRelevantMessage.permalink;

        return `Found a match in Slack! ${author} said: "${text}" (Link: ${permalink})`;

    } catch (error) {
        console.error("Error checking Slack:", error);
        return "Sorry, I had trouble connecting to Slack.";
    }
}

export async function getGitHubPRFeedback(currentBranchName: string): Promise<string | null> {
    initClients();
    try {
        // 1. Find the PR associated with the branch
        const { data: pullRequests } = await octokit.pulls.list({
            owner: GITHUB_OWNER,
            repo: GITHUB_REPO,
            state: "open",
            head: `${GITHUB_OWNER}:${currentBranchName}`,
        });

        if (pullRequests.length === 0) {
            return "No open PR found for that branch.";
        }

        const pr = pullRequests[0];
        const pull_number = pr.number;

        // 2. Get the review comments for that PR
        const { data: comments } = await octokit.pulls.listReviewComments({
            owner: GITHUB_OWNER,
            repo: GITHUB_REPO,
            pull_number,
        });

        if (comments.length === 0) {
            return "Found the PR, but no review comments yet.";
        }

        // 3. Format the comments
        const formattedComments = comments.map(
            (comment) => `- ${comment.user?.login} said: "${comment.body}"`
        );

        return `Found PR #${pull_number}. Here's the latest feedback:\n${formattedComments.join("\n")}`;

    } catch (error) {
        console.error("Error fetching from GitHub:", error);
        return "Sorry, I had trouble connecting to GitHub.";
    }
}
