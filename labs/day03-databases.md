# Day 3 Lab: Biological Databases

Databases are the everyday tools of bioinformatics — this lab is a
hands-on tour through the major ones, using a handful of real genes,
proteins, and structures as concrete examples rather than abstract
descriptions. Each section below introduces one database (or a small
group of related ones) and then asks you to actually use it.

You may discuss methods and approaches with your peers, but the answer
you submit must be your own. See [Course Information &
Logistics](../course-info.qmd) for this course's general lab-quiz
policy (50% correct to pass, one redo chance if you fail, same deadline
for every lab).

## EMBL-EBI, DDBJ, and NIH GenBank

Three of the world's primary nucleotide-sequence archives: the European
Nucleotide Archive (ENA, part of EMBL-EBI, Cambridge UK), the DNA Data
Bank of Japan (DDBJ), and GenBank (hosted by NIH's NCBI, USA). The same
underlying data is exchanged between all three, but accession numbers
and exact record formatting can differ.

**Q1.** The *gp52* gene from the bacteriophage *Caviid betaherpesvirus 2*
has accession `AGE11531` in the ENA (the protein product; the nucleotide
accession is the same in GenBank). What is the accession number of the
*whole genome* of *Caviid betaherpesvirus 2* in NIH GenBank? If more than
one option is available, choose the one where `AGE11531` is actually
present. *Hint: check that the entries cite the same publication.*

## UCSC Genome Browser

The UCSC Genome Browser lets you view any of over a hundred genomes,
including several different **builds** (assembly versions) of the human
genome, at any scale from a whole chromosome down to a single
nucleotide.

**Q2.** Look up the gene *TP53BP1* (human) in the UCSC Genome Browser.
Compare the 2013 build against the 2009 build (use the first result
under the "GENCODE Genes" category if more than one comes up). What is
the exact chromosome and coordinate range for *TP53BP1* in each build?

## Connecting the PDB and GenBank

The protein **2WNR** belongs to the archaeon *Methanothermobacter
thermautotrophicus*. Use it to practice moving between a structure
database and a sequence database for the same molecule.

**Q3.** In the PDB, what experimental method was used to determine the
structure of 2WNR? *(Cryo-EM / NMR / X-ray diffraction)*

**Q4.** Find the corresponding gene(s) for 2WNR in NIH GenBank. What is
the corresponding official symbol/gene name? Check all that apply:
`rrz41` · `rrp41` · `rrp42` · `rrp43` · `rrp48`

## GenBank and RNAcentral together

**Q5.** *Saccharomyces cerevisiae* (baker's yeast) has a GenBank entry
with accession `U49845`. Find, in that record: the organism's taxonomy
ID, and the (complete, not partial) gene(s) it contains. Then use that
taxonomy ID to search [RNAcentral](https://rnacentral.org/) (see their
[text-search help](https://rnacentral.org/help/text-search) if needed) —
how many sequences does the search return? (This number grows as
RNAcentral is updated — report what you get today.)

## Entrez

[Entrez](https://www.ncbi.nlm.nih.gov/search/) is NCBI's unified search
portal across nucleotide/protein sequences, structures, taxonomy,
literature, and more.

**Q6.** Look up *Saccharomyces cerevisiae* in Entrez. On the entry page,
in the "Proteins" field, how many structures are listed as related to
it?

**Q7.** From there, open the taxonomy page for *S. cerevisiae* and scroll
to its own protein field. How many 3D structures does *that* page list?
(This will likely differ from Q6's number — Entrez's taxonomy page and
its general search-portal page don't count the same thing the same way;
noticing that discrepancy is part of the point.)

## PubMed and PubMed Central

[PubMed](https://pubmed.ncbi.nlm.nih.gov/) indexes citations/abstracts;
its sister archive [PubMed Central](https://www.ncbi.nlm.nih.gov/pmc/)
(PMC) holds freely available full-text articles. Boolean operators
(`AND`, `OR`, `NOT`), exact-phrase quoting (`"membrane protein"` vs.
unquoted `membrane protein`), and field tags in square brackets (e.g.
`[title]`, `[author]`) all sharpen a search — see NCBI's [search field
documentation](https://www.ncbi.nlm.nih.gov/books/NBK3827/#_pubmedhelp_Search_Field_Descriptions_and_)
for the full list.

**Q8.** How many articles on *bacteriorhodopsin* with *Henderson* as an
author does PubMed find? How many full-text articles on the same search
does PMC find (a different website from PubMed)? In what year (`XXXX`)
was Henderson's first **review** article with "bacteriorhodopsin" in the
**title** published?

## UniProt

[UniProt](https://www.uniprot.org/) is a secondary database — it draws
its content from Swiss-Prot, TrEMBL, and PIR, adding literature-derived
annotation on top. This section uses *CDC28*, the gene encoding *S.
cerevisiae*'s major cyclin-dependent kinase (the functional homolog of
mammalian CDK1, and a central model for how CDKs work generally).

**Q9.** Why does TrEMBL contain considerably more sequences than
Swiss-Prot? Check all that apply:

- Swiss-Prot is a manually annotated subset of TrEMBL
- Swiss-Prot is a primary database
- Swiss-Prot takes user submissions
- TrEMBL is a manually annotated subset of Swiss-Prot
- TrEMBL mainly consists of protein sequences computationally translated from a primary nucleotide-sequence database

**Q10.** How do you actually know a protein exists (rather than being
purely predicted)? Check all that apply:

- There is experimental evidence at the protein level
- Its sequence can be found in UniProt
- A gene encoding it exists
- There is evidence of an mRNA from which its amino-acid sequence can be derived
- Its atomic coordinates can be predicted

**Q11.** Search for *CDC28* in UniProtKB. What is the UniProt entry code
for the **reviewed** entry belonging to *S. cerevisiae*?

**Q12.** On that entry's page, go to the interactions section. How many
binary interactions are listed with **exactly two** experiments as
supporting evidence? (This is a live, curated count — it can grow as
more interaction evidence gets added.)

## Pfam / InterPro

[InterPro](https://www.ebi.ac.uk/interpro/) integrates Pfam and several
other protein-family/domain databases into one resource. A protein's
InterPro entry shows its domain composition — which families/domains it
contains — plus, for many domains, a **domain architecture** view: every
protein sharing that same combination of domains.

**Q13.** Check all that apply, about protein domains in general:

- Domains are the least conserved part of a protein
- In a protein's quaternary structure, several domains can exist together
- Domains are so important that they're never subject to evolutionary pressure
- A domain is a conserved, functionally independent part of a protein
- Only a stretch of at least 300 residues can be classified as a domain
- The same domain can appear in many different proteins
- Every possible domain has already been functionally characterized

**Q14.** Find the InterPro entry for CDC28/CDK1 in yeast (search by the
UniProt accession from Q11). What family does it belong to? How many
entries (across all of InterPro's member databases) are associated with
this protein? What is the accession of its main protein-kinase domain?
Open that domain's "domain architectures" view — how many proteins
share that same architecture? (Also a live, growing count.)

## The Protein Data Bank and the AlphaFold Protein Structure Database

The [PDB](https://www.rcsb.org/) holds experimentally determined protein
structures (X-ray crystallography, NMR, cryo-EM). The [AlphaFold Protein
Structure Database](https://alphafold.ebi.ac.uk/) holds AlphaFold2's
*predicted* structures instead, each with a per-residue confidence score
(pLDDT) — the confidence can vary a lot across a single protein.

**Q15.** Search "*Saccharomyces cerevisiae*" in the PDB (a plain search,
not a filtered/advanced one). Which resulting structure has the best
(lowest-number) resolution? Give its 4-letter PDB code. Then use the
advanced search's "InterPro Protein Family" filter with the domain
accession from Q14 — among structures with that domain *and* *S.
cerevisiae* as the source organism, how many have resolution better than
2 Å? What is the 4-letter code of the best one? (PDB deposition is
ongoing — today's best-resolution hit may not match last year's; report
what you find.)

**Q16.** Which ligands are present in that best-resolution,
domain-filtered structure from Q15? Check all that apply: no ligands ·
retinol · sulfate ion · glycerol · acetate ion · palmitic acid · octyl
beta-D-glucopyranoside · glucose · oxiretinol · zinc ion.

**Q17.** Find the predicted structure for CDC28 (baker's yeast) in the
AlphaFold Protein Structure Database. Which kind of secondary-structure
element is associated with the region of *lowest* model confidence?
Check all that apply: a terminal loop · a transmembrane helix · a loop
(non-terminal) · a section of beta sheets.
