"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearAuthCookies = exports.setAuthCookies = void 0;
const auth_1 = require("../../common/constants/auth");
const env_1 = require("../../config/env");
const baseCookieOptions = {
    httpOnly: true,
    secure: env_1.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/"
};
const setAuthCookies = (res, accessToken, refreshToken) => {
    res.cookie(auth_1.ACCESS_TOKEN_COOKIE, accessToken, {
        ...baseCookieOptions,
        maxAge: 15 * 60 * 1000
    });
    res.cookie(auth_1.REFRESH_TOKEN_COOKIE, refreshToken, {
        ...baseCookieOptions,
        maxAge: 30 * 24 * 60 * 60 * 1000
    });
};
exports.setAuthCookies = setAuthCookies;
const clearAuthCookies = (res) => {
    res.clearCookie(auth_1.ACCESS_TOKEN_COOKIE, baseCookieOptions);
    res.clearCookie(auth_1.REFRESH_TOKEN_COOKIE, baseCookieOptions);
};
exports.clearAuthCookies = clearAuthCookies;
