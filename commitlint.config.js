module.exports = {
    extends: ['@commitlint/config-conventional'],
    rules: {
        // Enforce scopes based on project structure
        'scope-enum': [
            2,
            'always',
            ['shared', 'client', 'server', 'ci', 'docs', 'deps', 'config', 'web'],
        ],
        'scope-empty': [2, 'never'], // Scope is required
        'type-enum': [
            2,
            'always',
            [
                'feat', // New feature
                'fix', // Bug fix
                'docs', // Documentation only
                'style', // Code style changes (formatting, etc)
                'refactor', // Code refactoring
                'perf', // Performance improvements
                'test', // Adding or updating tests
                'build', // Build system changes
                'ci', // CI/CD changes
                'chore', // Other changes (maintenance, etc)
                'revert', // Revert a previous commit
            ],
        ],
        'subject-case': [2, 'never', ['start-case', 'pascal-case', 'upper-case']],
        'subject-empty': [2, 'never'],
        'subject-full-stop': [2, 'never', '.'],
        'header-max-length': [2, 'always', 100],
    },
};
