"use client";

import { useDispatch, useSelector, useStore } from "react-redux";
import type { TypedUseSelectorHook } from "react-redux";

import type { AppDispatch, AppStore, RootState } from "@/store";

// 型付き hook を 1 箇所に固定し、component ごとの型 import を減らす。
export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
export const useAppStore = useStore.withTypes<AppStore>();
