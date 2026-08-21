import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import * as argon from "argon2";
import * as crypto from "crypto";
import { Entry } from "ldapts";
import { I18nService } from "nestjs-i18n";
import { AuthSignInDTO } from "src/auth/dto/authSignIn.dto";
import { EmailService } from "src/email/email.service";
import { duplicatedField } from "src/prisma/prismaError";
import { PrismaService } from "src/prisma/prisma.service";
import { inspect } from "util";
import { ConfigService } from "../config/config.service";
import { FileService } from "../file/file.service";
import { CreateUserDTO } from "./dto/createUser.dto";
import { UpdateUserDto } from "./dto/updateUser.dto";

@Injectable()
export class UserSevice {
  private readonly logger = new Logger(UserSevice.name);

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private fileService: FileService,
    private configService: ConfigService,
    private readonly i18n: I18nService,
  ) {}

  async list() {
    return await this.prisma.user.findMany();
  }

  async get(id: string) {
    return await this.prisma.user.findUnique({ where: { id } });
  }

  async create(dto: CreateUserDTO) {
    let hash: string;
    let randomPassword: string;

    if (dto.password && !(await this.enforcePasswordPolicy(dto.password))) {
      throw new BadRequestException(this.i18n.t("auth.passwordPolicyNotMet"));
    }

    // The password can be undefined if the user is invited by an admin
    if (!dto.password) {
      randomPassword = crypto.randomUUID();
      hash = await argon.hash(randomPassword);
    } else {
      hash = await argon.hash(dto.password);
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            ...dto,
            password: hash,
          },
        });

        if (randomPassword) {
          await this.emailService.sendInviteEmail(dto.email, randomPassword);
        }

        return user;
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code == "P2002") {
          const duplicatedFieldName = duplicatedField(e);
          throw new BadRequestException(
            this.i18n.t("auth.userAlreadyExists", {
              args: { field: duplicatedFieldName },
            }),
          );
        }
      }
    }
  }

  async update(id: string, user: UpdateUserDto) {
    try {

      if (user.password && !(await this.enforcePasswordPolicy(user.password))) {
        throw new BadRequestException(
          this.i18n.t("auth.passwordPolicyNotMet"),
        );
      }

      const hash = user.password && (await argon.hash(user.password));

      return await this.prisma.user.update({
        where: { id },
        data: { ...user, password: hash },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code == "P2002") {
          const duplicatedFieldName = duplicatedField(e);
          throw new BadRequestException(
            this.i18n.t("auth.userAlreadyExists", {
              args: { field: duplicatedFieldName },
            }),
          );
        }
      }
    }
  }

  async delete(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { shares: true },
    });
    if (!user) throw new BadRequestException(this.i18n.t("auth.userNotFound"));

    if (user.isAdmin) {
      const userCount = await this.prisma.user.count({
        where: { isAdmin: true },
      });

      if (userCount === 1) {
        throw new BadRequestException(
          this.i18n.t("auth.cannotDeleteLastAdmin"),
        );
      }
    }

    await Promise.all(
      user.shares.map((share) => this.fileService.deleteAllFiles(share.id)),
    );

    return await this.prisma.user.delete({ where: { id } });
  }

  async findOrCreateFromLDAP(
    providedCredentials: AuthSignInDTO,
    ldapEntry: Entry,
  ) {
    const fieldNameMemberOf = this.configService.get("ldap.fieldNameMemberOf");
    const fieldNameEmail = this.configService.get("ldap.fieldNameEmail");

    let isAdmin = false;
    if (fieldNameMemberOf in ldapEntry) {
      const adminGroup = this.configService.get("ldap.adminGroups");
      const entryGroups = Array.isArray(ldapEntry[fieldNameMemberOf])
        ? ldapEntry[fieldNameMemberOf]
        : [ldapEntry[fieldNameMemberOf]];
      isAdmin = entryGroups.includes(adminGroup) ?? false;
    } else {
      this.logger.warn(
        `Trying to create/update a ldap user but the member field ${fieldNameMemberOf} is not present.`,
      );
    }

    let userEmail: string | null = null;
    if (fieldNameEmail in ldapEntry) {
      const value = Array.isArray(ldapEntry[fieldNameEmail])
        ? ldapEntry[fieldNameEmail][0]
        : ldapEntry[fieldNameEmail];
      if (value) {
        userEmail = value.toString();
      }
    } else {
      this.logger.warn(
        `Trying to create/update a ldap user but the email field ${fieldNameEmail} is not present.`,
      );
    }

    if (providedCredentials.email) {
      /* if LDAP does not provides an users email address, take the user provided email address instead */
      userEmail = providedCredentials.email;
    }

    const randomId = crypto.randomUUID();
    const placeholderUsername = `ldap_user_${randomId}`;
    const placeholderEMail = `${randomId}@ldap.local`;

    try {
      const user = await this.prisma.user.upsert({
        create: {
          username: providedCredentials.username ?? placeholderUsername,
          email: userEmail ?? placeholderEMail,
          password: await argon.hash(crypto.randomUUID()),

          isAdmin,
          ldapDN: ldapEntry.dn,
        },
        update: {
          isAdmin,
          ldapDN: ldapEntry.dn,
        },
        where: {
          ldapDN: ldapEntry.dn,
        },
      });

      if (user.username === placeholderUsername) {
        /* Give the user a human readable name if the user has been created with a placeholder username */
        await this.prisma.user
          .update({
            where: {
              id: user.id,
            },
            data: {
              username: `user_${user.id}`,
            },
          })
          .then((newUser) => {
            user.username = newUser.username;
          })
          .catch((error) => {
            this.logger.warn(
              `Failed to update users ${user.id} placeholder username: ${inspect(error)}`,
            );
          });
      }

      if (userEmail && userEmail !== user.email) {
        /* Sync users email if it has changed */
        await this.prisma.user
          .update({
            where: {
              id: user.id,
            },
            data: {
              email: userEmail,
            },
          })
          .then((newUser) => {
            this.logger.log(
              `Updated users ${user.id} email from ldap from ${user.email} to ${userEmail}.`,
            );
            user.email = newUser.email;
          })
          .catch((error) => {
            this.logger.error(
              `Failed to update users ${user.id} email to ${userEmail}: ${inspect(error)}`,
            );
          });
      }

      return user;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code == "P2002") {
          const duplicatedFieldName = duplicatedField(e);
          throw new BadRequestException(
            this.i18n.t("auth.userAlreadyExists", {
              args: { field: duplicatedFieldName },
            }),
          );
        }
      }
    }
  }

  async enforcePasswordPolicy(password: string): Promise<boolean> {
    if (!this.configService.get("security.customPasswordPolicy")) {
      return true;
    }

    const minLength = this.configService.get("security.minLength");
    const requireUppercase = this.configService.get(
      "security.requireUppercase",
    );
    const requireLowercase = this.configService.get(
      "security.requireLowercase",
    );
    const requireNumber = this.configService.get("security.requireNumber");
    const requireSpecialCharacter = this.configService.get(
      "security.requireSpecialCharacter",
    );

    if (
      password.length < minLength ||
      (!password.match(/[A-Z]/) && requireUppercase) ||
      (!password.match(/[a-z]/) && requireLowercase) ||
      (!password.match(/[0-9]/) && requireNumber) ||
      (!password.match(/[^A-Za-z0-9]/) && requireSpecialCharacter)
    ) {
      return false;
    }

    return true;
  }
}
