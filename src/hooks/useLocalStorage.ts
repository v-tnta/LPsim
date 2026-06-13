import { useState } from 'react';

/**
 * localStorage と連動して状態を永続化するためのカスタムフックです。
 * @param key ローカルストレージで使用するキー
 * @param initialValue 初期値
 */
export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
  // 初期状態をロードする (SSR対応も含めて安全にtry-catch)
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (item) return JSON.parse(item) as T;
      return initialValue;
    } catch (error) {
      console.error(`[useLocalStorage] Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // 状態が変化したときに localStorage に自動保存する
  const setValue = (value: T | ((val: T) => T)) => {
    try {
      // 関数型アップデートにも対応
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(`[useLocalStorage] Error setting localStorage key "${key}":`, error);
    }
  };

  return [storedValue, setValue];
}
