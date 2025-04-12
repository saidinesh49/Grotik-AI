<script lang="ts">
    import { onMount } from 'svelte';
    
    export let className = '';
    export let borderSize = 5;
    export let borderRadius = 20;
    export let neonColors = {
        firstColor: '#ff00aa',
        secondColor: '#00FFF1'
    };
    
    let cardElement: HTMLDivElement;
    let isHovered = false;
    
    function handleMouseMove(event: MouseEvent) {
        if (!cardElement) return;
        
        const rect = cardElement.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        const angleX = (x - centerX) / centerX;
        const angleY = (y - centerY) / centerY;
        
        cardElement.style.setProperty('--angle-x', `${angleX * 10}deg`);
        cardElement.style.setProperty('--angle-y', `${angleY * 10}deg`);
    }
    
    function handleMouseEnter() {
        isHovered = true;
    }
    
    function handleMouseLeave() {
        isHovered = false;
    }
</script>

<div 
    bind:this={cardElement}
    class="neon-gradient-card {className}"
    style="
        --border-size: {borderSize}px;
        --border-radius: {borderRadius}px;
        --first-color: {neonColors.firstColor};
        --second-color: {neonColors.secondColor};
        --angle-x: 0deg;
        --angle-y: 0deg;
    "
    on:mousemove={handleMouseMove}
    on:mouseenter={handleMouseEnter}
    on:mouseleave={handleMouseLeave}
>
    <div class="neon-gradient-card-content">
        <slot />
    </div>
</div>

<style>
    .neon-gradient-card {
        position: relative;
        border-radius: var(--border-radius);
        background: rgba(0, 0, 0, 0.2);
        backdrop-filter: blur(10px);
        overflow: hidden;
        transition: transform 0.3s ease;
        transform: perspective(1000px) rotateX(var(--angle-y)) rotateY(var(--angle-x));
    }
    
    .neon-gradient-card::before {
        content: '';
        position: absolute;
        inset: 0;
        border-radius: var(--border-radius);
        padding: var(--border-size);
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
    
    .neon-gradient-card:hover::before {
        opacity: 1;
    }
    
    .neon-gradient-card-content {
        position: relative;
        z-index: 1;
        padding: calc(var(--border-size) * 2);
    }
</style> 