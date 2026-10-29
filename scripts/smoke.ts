import { loadRepository } from '../lib/github';
for (const input of ['octocat/Hello-World', 'facebook/react', 'microsoft/TypeScript']) {
    try {
        const repo = await loadRepository(input);
        console.log(JSON.stringify({ repository: input, branch: repo.branch, files: repo.files.length, status: 'passed' }));
    }
    catch (error) {
        console.log(JSON.stringify({ repository: input, status: 'unavailable', reason: error instanceof Error ? error.message : String(error) }));
        process.exitCode = 1;
    }
}
