import { createCustomItemsComposable } from './useCustomItems.client'

export const DEFAULT_TOPICS = ['TV', '냉장고'] as const

const _composable = createCustomItemsComposable({
  idbKey:          'custom-topics',
  idbRenamedKey:   'renamed-default-topics',
  lsKey:           'ssok-custom-topics',
  lsRenamedKey:    'ssok-renamed-default-topics',
  defaults:        DEFAULT_TOPICS,
  stateKey:        'customTopics',
  renamedStateKey: 'renamedDefaultTopics',
  // 대소문자 구분 없이 중복 체크
  isDuplicate: (existing, trimmed) => {
    const lower = trimmed.toLowerCase()
    return existing.some(t => t.toLowerCase() === lower)
  },
})

export const useCustomTopics = () => {
  const { customItems, renamedDefaults, addItem, renameItem, allChips, effectiveDefaults } = _composable()
  return {
    customTopics:           customItems,
    renamedDefaultTopics:   renamedDefaults,
    addCustomTopic:         addItem,
    renameCustomTopic:      renameItem,
    allTopicChips:          allChips,
    effectiveDefaultTopics: effectiveDefaults,
  }
}
