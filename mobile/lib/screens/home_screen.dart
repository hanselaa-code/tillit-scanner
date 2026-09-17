import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';
import 'result_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final TextEditingController _searchController = TextEditingController();
  final ImagePicker _picker = ImagePicker();
  final ApiService _apiService = ApiService();

  bool _isLoading = false;
  String _loadingStatus = 'Forbereder analyse...';

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _performAnalysis({XFile? imageFile, String? query}) async {
    setState(() {
      _isLoading = true;
      _loadingStatus = imageFile != null
          ? 'Kjører multimodal visjonsanalyse på bildet...'
          : 'Slår opp i Brønnøysundregistrene og domenedata...';
    });

    try {
      final report = await _apiService.analyze(
        imageFile: imageFile,
        manualQuery: query,
      );

      if (!mounted) return;

      setState(() => _isLoading = false);

      Navigator.of(context).push(
        MaterialPageRoute(
          builder: (context) => ResultScreen(report: report),
        ),
      );
    } catch (e) {
      if (!mounted) return;
      setState(() => _isLoading = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Analysefeil: ${e.toString()}'),
          backgroundColor: AppTheme.dangerRed,
        ),
      );
    }
  }

  Future<void> _captureImage() async {
    try {
      final XFile? photo = await _picker.pickImage(
        source: ImageSource.camera,
        maxWidth: 1600,
        maxHeight: 1600,
        imageQuality: 85,
      );
      if (photo != null) {
        await _performAnalysis(imageFile: photo);
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Kamera utilgjengelig: $e')),
      );
    }
  }

  Future<void> _pickFromGallery() async {
    try {
      final XFile? image = await _picker.pickImage(
        source: ImageSource.gallery,
        maxWidth: 1600,
        maxHeight: 1600,
        imageQuality: 85,
      );
      if (image != null) {
        await _performAnalysis(imageFile: image);
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Galleri utilgjengelig: $e')),
      );
    }
  }

  void _submitManualQuery() {
    final query = _searchController.text.trim();
    if (query.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Vennligst oppgi et firmanavn, org.nr eller en nettadresse.'),
        ),
      );
      return;
    }
    _performAnalysis(query: query);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: AppTheme.primaryBlue.withValues(alpha: 0.2),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(Icons.shield_rounded, color: AppTheme.primaryBlue, size: 20),
            ),
            const SizedBox(width: 8),
            const Text(
              'SCANSAFE',
              style: TextStyle(
                fontWeight: FontWeight.w800,
                letterSpacing: 0.5,
              ),
            ),
            const Text(
              ' / TILLIT',
              style: TextStyle(
                fontWeight: FontWeight.w400,
                color: AppTheme.textMuted,
                letterSpacing: 0.5,
              ),
            ),
          ],
        ),
      ),
      body: Stack(
        children: [
          SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Hero Banner
                Container(
                  padding: const EdgeInsets.all(22),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Color(0xFF1E293B), Color(0xFF0F172A)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: AppTheme.cardBorder),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: AppTheme.primaryBlue.withValues(alpha: 0.2),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: const Text(
                          'NORSK FORBRUKERVERN MED AI',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                            color: AppTheme.primaryBlue,
                            letterSpacing: 0.5,
                          ),
                        ),
                      ),
                      const SizedBox(height: 12),
                      const Text(
                        'Avslør svindel før du blir lurt',
                        style: TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.w800,
                          color: AppTheme.textPrimary,
                          letterSpacing: -0.5,
                        ),
                      ),
                      const SizedBox(height: 6),
                      const Text(
                        'Skann plakater, annonser i sosiale medier, nettbutikker eller sjekk norske selskaper direkte mot Brønnøysundregistrene.',
                        style: TextStyle(
                          fontSize: 13,
                          color: AppTheme.textSecondary,
                          height: 1.45,
                        ),
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 24),

                // Skannings-handlinger (Kamera og Galleri)
                const Text(
                  '1. Skann bilde eller skjermbilde',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: AppTheme.textPrimary,
                  ),
                ),
                const SizedBox(height: 12),

                Row(
                  children: [
                    Expanded(
                      child: _ScanOptionButton(
                        icon: Icons.camera_alt_rounded,
                        title: 'Ta bilde',
                        subtitle: 'Plakat, brev, skjerm',
                        onTap: _captureImage,
                        accentColor: AppTheme.primaryBlue,
                      ),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: _ScanOptionButton(
                        icon: Icons.photo_library_rounded,
                        title: 'Galleri',
                        subtitle: 'Skjermbilde fra SoMe',
                        onTap: _pickFromGallery,
                        accentColor: AppTheme.accentCyan,
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 26),

                // Manuell tekst/URL-søk
                const Text(
                  '2. Eller søk manuelt på aktør',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: AppTheme.textPrimary,
                  ),
                ),
                const SizedBox(height: 12),

                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _searchController,
                        onSubmitted: (_) => _submitManualQuery(),
                        decoration: const InputDecoration(
                          hintText: 'Nettadresse, org.nr eller firmanavn',
                          prefixIcon: Icon(Icons.search_rounded, color: AppTheme.textMuted),
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    ElevatedButton(
                      onPressed: _submitManualQuery,
                      style: ElevatedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                      ),
                      child: const Icon(Icons.arrow_forward_rounded),
                    ),
                  ],
                ),

                const SizedBox(height: 24),

                // Hurtigtester / Eksempler for demonstrasjon
                const Text(
                  'Hurtigtester for demonstrasjon',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: AppTheme.textMuted,
                  ),
                ),
                const SizedBox(height: 10),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    _QuickChip(
                      label: 'Falsk investering (.top)',
                      isDanger: true,
                      onTap: () {
                        _searchController.text = 'https://invester-kjapt.top';
                        _submitManualQuery();
                      },
                    ),
                    _QuickChip(
                      label: 'DNB ASA (Legitim)',
                      isDanger: false,
                      onTap: () {
                        _searchController.text = '984851006'; // DNB Bank ASA
                        _submitManualQuery();
                      },
                    ),
                    _QuickChip(
                      label: 'Vipps Mobilbetaling',
                      isDanger: false,
                      onTap: () {
                        _searchController.text = 'Vipps AS';
                        _submitManualQuery();
                      },
                    ),
                    _QuickChip(
                      label: 'Falsk Kjendisannonse',
                      isDanger: true,
                      onTap: () {
                        _searchController.text = 'kjendis-avslører hemmelighet';
                        _submitManualQuery();
                      },
                    ),
                  ],
                ),

                const SizedBox(height: 32),
              ],
            ),
          ),

          // Laste-overlay under analyse
          if (_isLoading)
            Container(
              color: Colors.black.withValues(alpha: 0.75),
              child: Center(
                child: Container(
                  margin: const EdgeInsets.symmetric(horizontal: 32),
                  padding: const EdgeInsets.all(28),
                  decoration: BoxDecoration(
                    color: AppTheme.surface,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: AppTheme.cardBorder),
                  ),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const CircularProgressIndicator(
                        valueColor: AlwaysStoppedAnimation<Color>(AppTheme.primaryBlue),
                      ),
                      const SizedBox(height: 20),
                      const Text(
                        'Analyserer sikkerhet...',
                        style: TextStyle(
                          fontSize: 17,
                          fontWeight: FontWeight.w700,
                          color: AppTheme.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        _loadingStatus,
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                          fontSize: 13,
                          color: AppTheme.textSecondary,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _ScanOptionButton extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;
  final Color accentColor;

  const _ScanOptionButton({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onTap,
    required this.accentColor,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          color: AppTheme.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppTheme.cardBorder),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: accentColor.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(icon, color: accentColor, size: 28),
            ),
            const SizedBox(height: 14),
            Text(
              title,
              style: const TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w700,
                color: AppTheme.textPrimary,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              subtitle,
              style: const TextStyle(
                fontSize: 12,
                color: AppTheme.textSecondary,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _QuickChip extends StatelessWidget {
  final String label;
  final bool isDanger;
  final VoidCallback onTap;

  const _QuickChip({
    required this.label,
    required this.isDanger,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return ActionChip(
      onPressed: onTap,
      backgroundColor: isDanger
          ? AppTheme.dangerRed.withValues(alpha: 0.15)
          : AppTheme.surfaceElevated,
      side: BorderSide(
        color: isDanger
            ? AppTheme.dangerRed.withValues(alpha: 0.4)
            : AppTheme.cardBorder,
      ),
      label: Text(
        label,
        style: TextStyle(
          fontSize: 12,
          color: isDanger ? AppTheme.dangerRed : AppTheme.textSecondary,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}
