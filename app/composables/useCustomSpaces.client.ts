import { createCustomItemsComposable } from './useCustomItems.client'

export const DEFAULT_SPACES = ['거실', '주방'] as const

const _composable = createCustomItemsComposable({
  idbKey:          'custom-spaces',
  idbRenamedKey:   'renamed-default-spaces',
  lsKey:           'ssok-custom-spaces',
  lsRenamedKey:    'ssok-renamed-default-spaces',
  defaults:        DEFAULT_SPACES,
  stateKey:        'customSpaces',
  renamedStateKey: 'renamedDefaultSpaces',
})

export const useCustomSpaces = () => {
  const { customItems, renamedDefaults, addItem, renameItem, allChips, effectiveDefaults } = _composable()
  return {
    customSpaces:          customItems,
    renamedDefaultSpaces:  renamedDefaults,
    addCustomSpace:        addItem,
    renameCustomSpace:     renameItem,
    allSpaceChips:         allChips,
    effectiveDefaultSpaces: effectiveDefaults,
  }
}
