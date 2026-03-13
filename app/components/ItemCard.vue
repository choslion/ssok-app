<template>
  <NuxtLink :to="to" class="item-card">
    <div class="item-card__header">
      <component :is="nameTag" class="item-card__name">{{ item.title }}</component>
      <!-- badge 슬롯: 기본값은 type 배지, 만료 페이지 등에서 D-day 배지로 교체 가능 -->
      <slot name="badge">
        <span
          class="item-card__badge"
          :class="'item-card__badge--' + item.type"
        >{{ TYPE_LABELS[item.type] }}</span>
      </slot>
    </div>

    <div class="item-card__meta">
      <span>{{ item.store ?? '—' }}</span>
      <span aria-hidden="true">·</span>
      <span>{{ item.purchaseDate ? formatDate(item.purchaseDate) : '—' }}</span>
    </div>

    <div class="item-card__footer">
      <!-- footer-left 슬롯: 기본값은 보증 상태, 만료 페이지에서 만료일로 교체 가능 -->
      <slot name="footer-left">
        <span
          class="item-card__warranty"
          :class="'item-card__warranty--' + warrantyStatus(item.warrantyUntil).type"
        >{{ warrantyStatus(item.warrantyUntil).label }}</span>
      </slot>
      <span v-if="item.price" class="item-card__amount">{{ formatAmount(item.price) }}</span>
    </div>
  </NuxtLink>
</template>

<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'
import type { Item } from '~~/shared/types/ssok'
import { TYPE_LABELS, formatDate, formatAmount, warrantyStatus } from '~~/shared/utils/format'

withDefaults(defineProps<{
  item: Item
  to: RouteLocationRaw
  nameTag?: string
}>(), { nameTag: 'h2' })
</script>

<style scoped lang="scss">
.item-card {
  display: block;
  background: var(--color-surface);
  border-radius: var(--radius-md);
  padding: var(--space-4) var(--space-5);
  box-shadow: var(--shadow-card);
  border: 1px solid transparent;
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);

  &:hover {
    border-color: rgba(255, 107, 0, 0.25);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.10);
  }

  &:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }

  &__header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--space-2);
    margin-bottom: var(--space-2);
  }

  &__name {
    font-size: 1rem;
    font-weight: 700;
    color: var(--color-text);
    line-height: 1.3;
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    margin: 0;
  }

  &__badge {
    flex-shrink: 0;
    font-size: 0.6875rem;
    font-weight: 600;
    color: var(--badge-color, var(--color-primary));
    background: var(--badge-bg, rgba(255, 107, 0, 0.1));
    padding: 2px var(--space-2);
    border-radius: var(--radius-full);
    white-space: nowrap;

    &--receipt  { --badge-color: #0369A1; --badge-bg: #E0F2FE; }
    &--warranty { --badge-color: #2F9E44; --badge-bg: #EBFBEE; }
    &--manual   { --badge-color: #7950F2; --badge-bg: #F3F0FF; }
  }

  &__meta {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    font-size: 0.8125rem;
    color: var(--color-sub);
    margin-bottom: var(--space-3);
  }

  &__footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
  }

  &__warranty {
    font-size: 0.75rem;
    font-weight: 600;
    padding: 2px var(--space-2);
    border-radius: var(--radius-full);

    &--normal  { color: #2F9E44; background: #EBFBEE; }
    &--soon    { color: #E8590C; background: #FFF4E6; }
    &--expired { color: #868E96; background: #F1F3F5; }
  }

  &__amount {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--color-text);
  }
}
</style>
