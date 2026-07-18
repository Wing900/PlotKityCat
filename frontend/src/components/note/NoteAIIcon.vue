<script setup lang="ts">
defineProps<{ name: "design" | "generate" }>();
</script>

<template>
  <svg class="note-ai-icon" viewBox="0 0 24 24" aria-hidden="true">
    <template v-if="name === 'design'">
      <path d="M7 4.5h6.2l3.8 3.8v11.2a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6.5a2 2 0 0 1 2-2z" />
      <path d="M13.2 4.5v3.8h3.8" />
      <path d="M17.5 3.7 Q18.24 5.76 20.3 6.5 Q18.24 7.24 17.5 9.3 Q16.76 7.24 14.7 6.5 Q16.76 5.76 17.5 3.7 Z" />
    </template>
    <template v-else>
      <path d="M5 19V5h14" />
      <path d="M6 12 Q 9 6 12 12 T 18 12" />
    </template>
  </svg>
</template>