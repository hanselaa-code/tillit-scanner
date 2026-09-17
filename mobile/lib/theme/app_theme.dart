import 'package:flutter/material.dart';

class AppTheme {
  static const Color background = Color(0xFF0A0E17);
  static const Color surface = Color(0xFF131A2A);
  static const Color surfaceElevated = Color(0xFF1B243B);
  static const Color cardBorder = Color(0xFF263352);
  
  static const Color primaryBlue = Color(0xFF3B82F6);
  static const Color primaryBlueDark = Color(0xFF1D4ED8);
  static const Color accentCyan = Color(0xFF06B6D4);
  
  static const Color safeGreen = Color(0xFF10B981);
  static const Color safeGreenBg = Color(0xFF064E3B);
  static const Color warningAmber = Color(0xFFF59E0B);
  static const Color warningAmberBg = Color(0xFF451A03);
  static const Color dangerRed = Color(0xFFEF4444);
  static const Color dangerRedBg = Color(0xFF450A0A);
  
  static const Color textPrimary = Color(0xFFF8FAFC);
  static const Color textSecondary = Color(0xFF94A3B8);
  static const Color textMuted = Color(0xFF64748B);

  static ThemeData get darkTheme {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      scaffoldBackgroundColor: background,
      primaryColor: primaryBlue,
      colorScheme: const ColorScheme.dark(
        primary: primaryBlue,
        secondary: accentCyan,
        surface: surface,
        error: dangerRed,
        onPrimary: Colors.white,
        onSurface: textPrimary,
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: background,
        elevation: 0,
        centerTitle: true,
        scrolledUnderElevation: 0,
        titleTextStyle: TextStyle(
          color: textPrimary,
          fontSize: 19,
          fontWeight: FontWeight.w700,
          letterSpacing: -0.3,
        ),
        iconTheme: IconThemeData(color: textPrimary),
      ),
      cardTheme: CardThemeData(
        color: surface,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: const BorderSide(color: cardBorder, width: 1),
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: primaryBlue,
          foregroundColor: Colors.white,
          elevation: 0,
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
          ),
          textStyle: const TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: surfaceElevated,
        contentPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: cardBorder),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: cardBorder),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: primaryBlue, width: 2),
        ),
        hintStyle: const TextStyle(color: textMuted, fontSize: 15),
      ),
    );
  }
}
