import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../models/analysis_result.dart';
import '../theme/app_theme.dart';

class DetailAccordion extends StatelessWidget {
  final FinalAnalysisReport report;

  const DetailAccordion({super.key, required this.report});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        if (report.brreg != null) _buildBrregCard(context, report.brreg!),
        if (report.domain != null) _buildDomainCard(report.domain!),
        if (report.vision != null) _buildVisionCard(report.vision!),
      ],
    );
  }

  Widget _buildBrregCard(BuildContext context, BrregDetails brreg) {
    return _AccordionCard(
      title: 'Brønnøysundregistrene',
      subtitle: brreg.found
          ? (brreg.name ?? 'Registrert enhet')
          : 'Ikke funnet i Enhetsregisteret',
      icon: Icons.business_rounded,
      isVerified: brreg.found && !brreg.isBankrupt && !brreg.isLiquidating,
      children: [
        if (!brreg.found)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 8.0),
            child: Text(
              'Aktøren eller navnet finnes ikke registrert som juridisk enhet i norske offentlige registre.',
              style: TextStyle(color: AppTheme.warningAmber, fontSize: 13),
            ),
          )
        else ...[
          _buildInfoRow('Firmanavn', brreg.name ?? 'Ukjent'),
          _buildInfoRow('Organisasjonsnummer', brreg.orgNumber ?? 'Ikke oppgitt'),
          _buildInfoRow('Selskapsform', brreg.orgForm ?? 'Ikke spesifisert'),
          _buildInfoRow('Stiftelsesdato', brreg.establishedDate ?? 'Ukjent'),
          _buildInfoRow(
            'MVA-registrert',
            brreg.isRegisteredInMva ? 'Ja (Merverdiavgiftsregisteret)' : 'Nei',
            highlightColor: brreg.isRegisteredInMva ? AppTheme.safeGreen : AppTheme.warningAmber,
          ),
          _buildInfoRow(
            'Konkursstatus',
            brreg.isBankrupt ? 'KONKURS' : (brreg.isLiquidating ? 'Under avvikling' : 'Aktiv (ingen konkurs)'),
            highlightColor: (brreg.isBankrupt || brreg.isLiquidating) ? AppTheme.dangerRed : AppTheme.safeGreen,
          ),
          if (brreg.ageYears != null)
            _buildInfoRow('Alder', '${brreg.ageYears} år i drift'),
          if (brreg.orgNumber != null) ...[
            const SizedBox(height: 10),
            OutlinedButton.icon(
              onPressed: () async {
                final url = Uri.parse('https://virksomhet.brreg.no/nb/oppslag/enheter/${brreg.orgNumber}');
                if (await canLaunchUrl(url)) {
                  await launchUrl(url, mode: LaunchMode.externalApplication);
                }
              },
              icon: const Icon(Icons.open_in_new_rounded, size: 16),
              label: const Text('Åpne offisiell Brreg-attest'),
              style: OutlinedButton.styleFrom(
                foregroundColor: AppTheme.primaryBlue,
                side: const BorderSide(color: AppTheme.primaryBlue),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
            ),
          ],
        ],
      ],
    );
  }

  Widget _buildDomainCard(DomainDetails domain) {
    return _AccordionCard(
      title: 'Nettadresse & Domene',
      subtitle: domain.domain.isNotEmpty ? domain.domain : 'Ingen nettside oppgitt',
      icon: Icons.language_rounded,
      isVerified: domain.isHttps && !domain.isSuspiciousTld && domain.dnsResolved,
      children: [
        _buildInfoRow('Domenenavn', domain.domain),
        _buildInfoRow(
          'HTTPS-sikkerhet',
          domain.isHttps ? 'Sikker (SSL/TLS aktivert)' : 'Ukryptert (Utrygt)',
          highlightColor: domain.isHttps ? AppTheme.safeGreen : AppTheme.dangerRed,
        ),
        _buildInfoRow(
          'Toppdomene-risiko',
          domain.isSuspiciousTld ? 'Høy risiko' : 'Normal',
          highlightColor: domain.isSuspiciousTld ? AppTheme.dangerRed : AppTheme.safeGreen,
        ),
        _buildInfoRow(
          'DNS-tilgjengelighet',
          domain.dnsResolved ? 'Aktiv på nettet' : 'Svarer ikke på oppslag',
          highlightColor: domain.dnsResolved ? AppTheme.safeGreen : AppTheme.warningAmber,
        ),
      ],
    );
  }

  Widget _buildVisionCard(VisionDetails vision) {
    return _AccordionCard(
      title: 'Bilde- & Visjonsanalyse',
      subtitle: vision.hasSuspiciousVisualDesign
          ? 'Mistenkelige visuelle mønstre funnet'
          : 'Tekst og logoer analysert',
      icon: Icons.document_scanner_rounded,
      isVerified: !vision.hasSuspiciousVisualDesign && vision.visualRedFlags.isEmpty,
      children: [
        if (vision.identifiedBrands.isNotEmpty)
          _buildInfoRow('Oppdagede merkevarer', vision.identifiedBrands.join(', ')),
        if (vision.detectedUrls.isNotEmpty)
          _buildInfoRow('Lenker i bilde', vision.detectedUrls.join(', ')),
        if (vision.summaryOfContent.isNotEmpty) ...[
          const SizedBox(height: 6),
          const Text(
            'Visuell oppsummering:',
            style: TextStyle(fontWeight: FontWeight.w600, color: AppTheme.textPrimary, fontSize: 13),
          ),
          const SizedBox(height: 4),
          Text(
            vision.summaryOfContent,
            style: const TextStyle(color: AppTheme.textSecondary, fontSize: 13, height: 1.4),
          ),
        ],
      ],
    );
  }

  Widget _buildInfoRow(String label, String value, {Color? highlightColor}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 5),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 140,
            child: Text(
              label,
              style: const TextStyle(
                fontSize: 13,
                color: AppTheme.textMuted,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: TextStyle(
                fontSize: 13,
                color: highlightColor ?? AppTheme.textPrimary,
                fontWeight: highlightColor != null ? FontWeight.w600 : FontWeight.w500,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _AccordionCard extends StatelessWidget {
  final String title;
  final String subtitle;
  final IconData icon;
  final bool isVerified;
  final List<Widget> children;

  const _AccordionCard({
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.isVerified,
    required this.children,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.cardBorder),
      ),
      child: Theme(
        data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
        child: ExpansionTile(
          initiallyExpanded: false,
          leading: Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: AppTheme.surfaceElevated,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(
              icon,
              color: isVerified ? AppTheme.safeGreen : AppTheme.primaryBlue,
              size: 22,
            ),
          ),
          title: Text(
            title,
            style: const TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w600,
              color: AppTheme.textPrimary,
            ),
          ),
          subtitle: Text(
            subtitle,
            style: const TextStyle(
              fontSize: 13,
              color: AppTheme.textSecondary,
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
          childrenPadding: const EdgeInsets.fromLTRB(18, 0, 18, 16),
          children: children,
        ),
      ),
    );
  }
}
