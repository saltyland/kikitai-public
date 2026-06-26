'use client';

import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'onboarding_completed';

/**
 * 初回オンボーディング（チュートリアル）の表示状態をlocalStorageで管理するフック。
 * SSR時はlocalStorageが無いため、マウント後にのみ判定する。
 */
export function useOnboarding() {
  // SSR時はlocalStorageが無いため、マウント後にuseEffectで一度だけ実値を読み込む
  const [state, setState] = useState({ isReady: false, hasCompleted: true });

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- マウント後にlocalStorageの実値を一度だけ反映する
    setState({
      isReady: true,
      hasCompleted: window.localStorage.getItem(STORAGE_KEY) === 'true',
    });
  }, []);

  const complete = useCallback(() => {
    window.localStorage.setItem(STORAGE_KEY, 'true');
    setState((prev) => ({ ...prev, hasCompleted: true }));
  }, []);

  const reset = useCallback(() => {
    window.localStorage.removeItem(STORAGE_KEY);
    setState((prev) => ({ ...prev, hasCompleted: false }));
  }, []);

  return {
    /** マウント後（localStorage判定後）にtrue。falseの間は描画を控える */
    isReady: state.isReady,
    /** チュートリアルを完了済みかどうか */
    hasCompleted: state.hasCompleted,
    /** 完了フラグを立てる */
    complete,
    /** フラグをリセットする（開発・デバッグ用） */
    reset,
  };
}
