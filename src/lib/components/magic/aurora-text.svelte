<script lang="ts">
  export let className = '';
  export let colors: string[] = ['#FF0080', '#7928CA', '#0070F3', '#38bdf8'];
  export let speed = 1;
  
  $: gradientStyle = `linear-gradient(135deg, ${colors.join(', ')}, ${colors[0]})`;
  $: animationDuration = `${10 / speed}s`;
</script>

<span class="relative inline-block {className}">
  <span class="sr-only">
    <slot />
  </span>
  <span
    class="relative animate-aurora bg-[length:200%_auto] bg-clip-text text-transparent"
    style="background-image: {gradientStyle}; animation-duration: {animationDuration};"
    aria-hidden="true"
  >
    <slot />
  </span>
</span>

<style>
  @keyframes aurora {
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
  
  .animate-aurora {
    animation: aurora linear infinite;
  }
</style> 