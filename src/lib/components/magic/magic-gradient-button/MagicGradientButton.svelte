<script lang="ts">
    export let className = '';
    export let type: 'button' | 'submit' | 'reset' = 'button';
    export let disabled = false;
    export let gradientColors = {
        firstColor: '#ff00aa',
        secondColor: '#00FFF1'
    };
    export let size: 'sm' | 'md' | 'lg' = 'md';

    const sizeClasses = {
        sm: 'px-4 py-2 text-sm',
        md: 'px-6 py-3 text-base',
        lg: 'px-8 py-4 text-lg'
    };
</script>

<button
    {type}
    {disabled}
    class="magic-gradient-button {sizeClasses[size]} {className}"
    style="
        --first-color: {gradientColors.firstColor};
        --second-color: {gradientColors.secondColor};
    "
    on:click
>
    <span class="button-content">
        <slot />
    </span>
    <span class="gradient-border"></span>
</button>

<style>
    :root {
        --light-bg: #ffffff;
        --light-text: #000000;
        --dark-bg: #000000;
        --dark-text: #ffffff;
    }

    .magic-gradient-button {
        position: relative;
        background: var(--light-bg); /* Automatically adapts based on light/dark mode */
        color: var(--light-text);
        border: none;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
        overflow: hidden;
        transition: all 0.3s ease;
    }

    /* Adjust styles for dark mode */
    @media (prefers-color-scheme: dark) {
        .magic-gradient-button {
            background: var(--dark-bg);
            color: var(--dark-text);
        }
    }

    .magic-gradient-button:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }

    .magic-gradient-button:not(:disabled):hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
    }

    .button-content {
        position: relative;
        z-index: 1;
    }

    .gradient-border {
        position: absolute;
        inset: 0;
        border-radius: 8px;
        padding: 2px;
        background: linear-gradient(
            45deg,
            var(--first-color),
            var(--second-color)
        );
        -webkit-mask: 
            linear-gradient(#fff 0 0) content-box, 
            linear-gradient(#fff 0 0);
        -webkit-mask-composite: xor;
        mask-composite: exclude;
        opacity: 0.8;
        transition: opacity 0.3s ease;
    }

    .magic-gradient-button:not(:disabled):hover .gradient-border {
        opacity: 1;
    }

    @keyframes gradient-shift {
        0% {
            background-position: 0% 50%;
        }
        50% {
            background-position: 100% 50%;
        }
        100% {
            background-position: 0% 50%;
        }
    }

    .magic-gradient-button:not(:disabled):hover .gradient-border {
        background-size: 200% 200%;
        animation: gradient-shift 3s ease infinite;
    }
</style>
