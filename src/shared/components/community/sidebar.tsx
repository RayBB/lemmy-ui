import { Component, InfernoNode, linkEvent } from "inferno";
import { Link } from "inferno-router";
import {
  AddModToCommunity,
  BlockCommunity,
  CommunityModeratorView,
  CommunityView,
  DeleteCommunity,
  EditCommunity,
  FollowCommunity,
  Language,
  PersonView,
  PurgeCommunity,
  RemoveCommunity,
} from "lemmy-js-client";
import { i18n } from "../../i18next";
import { UserService } from "../../services";
import {
  amAdmin,
  amMod,
  amTopMod,
  getUnixTime,
  hostname,
  mdToHtml,
  myAuthRequired,
  numToSI,
} from "../../utils";
import { BannerIconHeader } from "../common/banner-icon-header";
import { Icon, PurgeWarning, Spinner } from "../common/icon";
import { CommunityForm } from "../community/community-form";
import { CommunityLink } from "../community/community-link";
import { PersonListing } from "../person/person-listing";

interface SidebarProps {
  community_view: CommunityView;
  moderators: CommunityModeratorView[];
  admins: PersonView[];
  allLanguages: Language[];
  siteLanguages: number[];
  communityLanguages?: number[];
  online: number;
  enableNsfw?: boolean;
  showIcon?: boolean;
  editable?: boolean;
  onDeleteCommunity(form: DeleteCommunity): void;
  onRemoveCommunity(form: RemoveCommunity): void;
  onLeaveModTeam(form: AddModToCommunity): void;
  onFollowCommunity(form: FollowCommunity): void;
  onBlockCommunity(form: BlockCommunity): void;
  onPurgeCommunity(form: PurgeCommunity): void;
  onEditCommunity(form: EditCommunity): void;
}

interface SidebarState {
  removeReason?: string;
  removeExpires?: string;
  showEdit: boolean;
  showRemoveDialog: boolean;
  showPurgeDialog: boolean;
  purgeReason?: string;
  showConfirmLeaveModTeam: boolean;
  deleteCommunityLoading: boolean;
  removeCommunityLoading: boolean;
  leaveModTeamLoading: boolean;
  followCommunityLoading: boolean;
  blockCommunityLoading: boolean;
  purgeCommunityLoading: boolean;
}

export class Sidebar extends Component<SidebarProps, SidebarState> {
  state: SidebarState = {
    showEdit: false,
    showRemoveDialog: false,
    showPurgeDialog: false,
    showConfirmLeaveModTeam: false,
    deleteCommunityLoading: false,
    removeCommunityLoading: false,
    leaveModTeamLoading: false,
    followCommunityLoading: false,
    blockCommunityLoading: false,
    purgeCommunityLoading: false,
  };

  constructor(props: any, context: any) {
    super(props, context);
    this.handleEditCancel = this.handleEditCancel.bind(this);
  }

  componentWillReceiveProps(
    nextProps: Readonly<{ children?: InfernoNode } & SidebarProps>
  ): void {
    if (this.props.moderators != nextProps.moderators) {
      this.setState({
        showConfirmLeaveModTeam: false,
      });
    }

    if (this.props.community_view != nextProps.community_view) {
      this.setState({
        showEdit: false,
        showPurgeDialog: false,
        showRemoveDialog: false,
        deleteCommunityLoading: false,
        removeCommunityLoading: false,
        leaveModTeamLoading: false,
        followCommunityLoading: false,
        blockCommunityLoading: false,
        purgeCommunityLoading: false,
      });
    }
  }

  render() {
    return (
      <div>
        {!this.state.showEdit ? (
          this.sidebar()
        ) : (
          <CommunityForm
            community_view={this.props.community_view}
            allLanguages={this.props.allLanguages}
            siteLanguages={this.props.siteLanguages}
            communityLanguages={this.props.communityLanguages}
            onUpsertCommunity={this.props.onEditCommunity}
            onCancel={this.handleEditCancel}
            enableNsfw={this.props.enableNsfw}
          />
        )}
      </div>
    );
  }

  sidebar() {
    const myUSerInfo = UserService.Instance.myUserInfo;
    const { name, actor_id } = this.props.community_view.community;
    return (
      <div>
        <div className="card border-secondary mb-3">
          <div className="card-body">
            {this.communityTitle()}
            {this.props.editable && this.adminButtons()}
            {myUSerInfo && this.subscribe()}
            {this.canPost && this.createPost()}
            {myUSerInfo && this.blockCommunity()}
            {!myUSerInfo && (
              <div className="alert alert-info" role="alert">
                {i18n.t("community_not_logged_in_alert", {
                  community: name,
                  instance: hostname(actor_id),
                })}
              </div>
            )}
          </div>
        </div>
        <div className="card border-secondary mb-3">
          <div className="card-body">
            {this.description()}
            {this.badges()}
            {this.mods()}
          </div>
        </div>
      </div>
    );
  }

  communityTitle() {
    const community = this.props.community_view.community;
    const subscribed = this.props.community_view.subscribed;
    return (
      <div>
        <h5 className="mb-0">
          {this.props.showIcon && !community.removed && (
            <BannerIconHeader icon={community.icon} banner={community.banner} />
          )}
          <span className="mr-2">
            <CommunityLink community={community} hideAvatar />
          </span>
          {subscribed === "Subscribed" && (
            <button
              className="btn btn-secondary btn-sm mr-2"
              onClick={linkEvent(this, this.handleUnfollowCommunity)}
            >
              {this.state.followCommunityLoading ? (
                <Spinner />
              ) : (
                <>
                  <Icon icon="check" classes="icon-inline text-success mr-1" />
                  {i18n.t("joined")}
                </>
              )}
            </button>
          )}
          {subscribed === "Pending" && (
            <button
              className="btn btn-warning mr-2"
              onClick={linkEvent(this, this.handleUnfollowCommunity)}
            >
              {this.state.followCommunityLoading ? (
                <Spinner />
              ) : (
                i18n.t("subscribe_pending")
              )}
            </button>
          )}
          {community.removed && (
            <small className="mr-2 text-muted font-italic">
              {i18n.t("removed")}
            </small>
          )}
          {community.deleted && (
            <small className="mr-2 text-muted font-italic">
              {i18n.t("deleted")}
            </small>
          )}
          {community.nsfw && (
            <small className="mr-2 text-muted font-italic">
              {i18n.t("nsfw")}
            </small>
          )}
        </h5>
        <CommunityLink
          community={community}
          realLink
          useApubName
          muted
          hideAvatar
        />
      </div>
    );
  }

  badges() {
    const community_view = this.props.community_view;
    const counts = community_view.counts;
    return (
      <ul className="my-1 list-inline">
        <li className="list-inline-item badge badge-secondary">
          {i18n.t("number_online", {
            count: this.props.online,
            formattedCount: numToSI(this.props.online),
          })}
        </li>
        <li
          className="list-inline-item badge badge-secondary pointer"
          data-tippy-content={i18n.t("active_users_in_the_last_day", {
            count: Number(counts.users_active_day),
            formattedCount: numToSI(counts.users_active_day),
          })}
        >
          {i18n.t("number_of_users", {
            count: Number(counts.users_active_day),
            formattedCount: numToSI(counts.users_active_day),
          })}{" "}
          / {i18n.t("day")}
        </li>
        <li
          className="list-inline-item badge badge-secondary pointer"
          data-tippy-content={i18n.t("active_users_in_the_last_week", {
            count: Number(counts.users_active_week),
            formattedCount: numToSI(counts.users_active_week),
          })}
        >
          {i18n.t("number_of_users", {
            count: Number(counts.users_active_week),
            formattedCount: numToSI(counts.users_active_week),
          })}{" "}
          / {i18n.t("week")}
        </li>
        <li
          className="list-inline-item badge badge-secondary pointer"
          data-tippy-content={i18n.t("active_users_in_the_last_month", {
            count: Number(counts.users_active_month),
            formattedCount: numToSI(counts.users_active_month),
          })}
        >
          {i18n.t("number_of_users", {
            count: Number(counts.users_active_month),
            formattedCount: numToSI(counts.users_active_month),
          })}{" "}
          / {i18n.t("month")}
        </li>
        <li
          className="list-inline-item badge badge-secondary pointer"
          data-tippy-content={i18n.t("active_users_in_the_last_six_months", {
            count: Number(counts.users_active_half_year),
            formattedCount: numToSI(counts.users_active_half_year),
          })}
        >
          {i18n.t("number_of_users", {
            count: Number(counts.users_active_half_year),
            formattedCount: numToSI(counts.users_active_half_year),
          })}{" "}
          / {i18n.t("number_of_months", { count: 6, formattedCount: 6 })}
        </li>
        <li className="list-inline-item badge badge-secondary">
          {i18n.t("number_of_subscribers", {
            count: Number(counts.subscribers),
            formattedCount: numToSI(counts.subscribers),
          })}
        </li>
        <li className="list-inline-item badge badge-secondary">
          {i18n.t("number_of_posts", {
            count: Number(counts.posts),
            formattedCount: numToSI(counts.posts),
          })}
        </li>
        <li className="list-inline-item badge badge-secondary">
          {i18n.t("number_of_comments", {
            count: Number(counts.comments),
            formattedCount: numToSI(counts.comments),
          })}
        </li>
        <li className="list-inline-item">
          <Link
            className="badge badge-primary"
            to={`/modlog/${this.props.community_view.community.id}`}
          >
            {i18n.t("modlog")}
          </Link>
        </li>
      </ul>
    );
  }

  mods() {
    return (
      <ul className="list-inline small">
        <li className="list-inline-item">{i18n.t("mods")}: </li>
        {this.props.moderators.map(mod => (
          <li key={mod.moderator.id} className="list-inline-item">
            <PersonListing person={mod.moderator} />
          </li>
        ))}
      </ul>
    );
  }

  createPost() {
    const cv = this.props.community_view;
    return (
      <Link
        className={`btn btn-secondary btn-block mb-2 ${
          cv.community.deleted || cv.community.removed ? "no-click" : ""
        }`}
        to={`/create_post?communityId=${cv.community.id}`}
      >
        {i18n.t("create_a_post")}
      </Link>
    );
  }

  subscribe() {
    const community_view = this.props.community_view;
    return (
      <div className="mb-2">
        {community_view.subscribed == "NotSubscribed" && (
          <button
            className="btn btn-secondary btn-block"
            onClick={linkEvent(this, this.handleFollowCommunity)}
          >
            {this.state.followCommunityLoading ? (
              <Spinner />
            ) : (
              i18n.t("subscribe")
            )}
          </button>
        )}
      </div>
    );
  }

  blockCommunity() {
    const community_view = this.props.community_view;
    const blocked = this.props.community_view.blocked;

    return (
      <div className="mb-2">
        {community_view.subscribed == "NotSubscribed" &&
          (blocked ? (
            <button
              className="btn btn-danger btn-block"
              onClick={linkEvent(this, this.handleBlockCommunity)}
            >
              {this.state.blockCommunityLoading ? (
                <Spinner />
              ) : (
                i18n.t("unblock_community")
              )}
            </button>
          ) : (
            <button
              className="btn btn-danger btn-block"
              onClick={linkEvent(this, this.handleBlockCommunity)}
            >
              {this.state.blockCommunityLoading ? (
                <Spinner />
              ) : (
                i18n.t("block_community")
              )}
            </button>
          ))}
      </div>
    );
  }

  description() {
    const desc = this.props.community_view.community.description;
    return (
      desc && (
        <div className="md-div" dangerouslySetInnerHTML={mdToHtml(desc)} />
      )
    );
  }

  adminButtons() {
    const community_view = this.props.community_view;
    return (
      <>
        <ul className="list-inline mb-1 text-muted font-weight-bold">
          {amMod(this.props.moderators) && (
            <>
              <li className="list-inline-item-action">
                <button
                  className="btn btn-link text-muted d-inline-block"
                  onClick={linkEvent(this, this.handleEditClick)}
                  data-tippy-content={i18n.t("edit")}
                  aria-label={i18n.t("edit")}
                >
                  <Icon icon="edit" classes="icon-inline" />
                </button>
              </li>
              {!amTopMod(this.props.moderators) &&
                (!this.state.showConfirmLeaveModTeam ? (
                  <li className="list-inline-item-action">
                    <button
                      className="btn btn-link text-muted d-inline-block"
                      onClick={linkEvent(
                        this,
                        this.handleShowConfirmLeaveModTeamClick
                      )}
                    >
                      {i18n.t("leave_mod_team")}
                    </button>
                  </li>
                ) : (
                  <>
                    <li className="list-inline-item-action">
                      {i18n.t("are_you_sure")}
                    </li>
                    <li className="list-inline-item-action">
                      <button
                        className="btn btn-link text-muted d-inline-block"
                        onClick={linkEvent(this, this.handleLeaveModTeam)}
                      >
                        {i18n.t("yes")}
                      </button>
                    </li>
                    <li className="list-inline-item-action">
                      <button
                        className="btn btn-link text-muted d-inline-block"
                        onClick={linkEvent(
                          this,
                          this.handleCancelLeaveModTeamClick
                        )}
                      >
                        {i18n.t("no")}
                      </button>
                    </li>
                  </>
                ))}
              {amTopMod(this.props.moderators) && (
                <li className="list-inline-item-action">
                  <button
                    className="btn btn-link text-muted d-inline-block"
                    onClick={linkEvent(this, this.handleDeleteCommunity)}
                    data-tippy-content={
                      !community_view.community.deleted
                        ? i18n.t("delete")
                        : i18n.t("restore")
                    }
                    aria-label={
                      !community_view.community.deleted
                        ? i18n.t("delete")
                        : i18n.t("restore")
                    }
                  >
                    {this.state.deleteCommunityLoading ? (
                      <Spinner />
                    ) : (
                      <Icon
                        icon="trash"
                        classes={`icon-inline ${
                          community_view.community.deleted && "text-danger"
                        }`}
                      />
                    )}{" "}
                  </button>
                </li>
              )}
            </>
          )}
          {amAdmin() && (
            <li className="list-inline-item">
              {!this.props.community_view.community.removed ? (
                <button
                  className="btn btn-link text-muted d-inline-block"
                  onClick={linkEvent(this, this.handleModRemoveShow)}
                >
                  {i18n.t("remove")}
                </button>
              ) : (
                <button
                  className="btn btn-link text-muted d-inline-block"
                  onClick={linkEvent(this, this.handleRemoveCommunity)}
                >
                  {this.state.removeCommunityLoading ? (
                    <Spinner />
                  ) : (
                    i18n.t("restore")
                  )}
                </button>
              )}
              <button
                className="btn btn-link text-muted d-inline-block"
                onClick={linkEvent(this, this.handlePurgeCommunityShow)}
                aria-label={i18n.t("purge_community")}
              >
                {i18n.t("purge_community")}
              </button>
            </li>
          )}
        </ul>
        {this.state.showRemoveDialog && (
          <form onSubmit={linkEvent(this, this.handleRemoveCommunity)}>
            <div className="form-group">
              <label className="col-form-label" htmlFor="remove-reason">
                {i18n.t("reason")}
              </label>
              <input
                type="text"
                id="remove-reason"
                className="form-control mr-2"
                placeholder={i18n.t("optional")}
                value={this.state.removeReason}
                onInput={linkEvent(this, this.handleModRemoveReasonChange)}
              />
            </div>
            {/* TODO hold off on expires for now */}
            {/* <div class="form-group row"> */}
            {/*   <label class="col-form-label">Expires</label> */}
            {/*   <input type="date" class="form-control mr-2" placeholder={i18n.t('expires')} value={this.state.removeExpires} onInput={linkEvent(this, this.handleModRemoveExpiresChange)} /> */}
            {/* </div> */}
            <div className="form-group">
              <button type="submit" className="btn btn-secondary">
                {this.state.removeCommunityLoading ? (
                  <Spinner />
                ) : (
                  i18n.t("remove_community")
                )}
              </button>
            </div>
          </form>
        )}
        {this.state.showPurgeDialog && (
          <form onSubmit={linkEvent(this, this.handlePurgeCommunity)}>
            <div className="form-group">
              <PurgeWarning />
            </div>
            <div className="form-group">
              <label className="sr-only" htmlFor="purge-reason">
                {i18n.t("reason")}
              </label>
              <input
                type="text"
                id="purge-reason"
                className="form-control mr-2"
                placeholder={i18n.t("reason")}
                value={this.state.purgeReason}
                onInput={linkEvent(this, this.handlePurgeReasonChange)}
              />
            </div>
            <div className="form-group">
              {this.state.purgeCommunityLoading ? (
                <Spinner />
              ) : (
                <button
                  type="submit"
                  className="btn btn-secondary"
                  aria-label={i18n.t("purge_community")}
                >
                  {i18n.t("purge_community")}
                </button>
              )}
            </div>
          </form>
        )}
      </>
    );
  }

  handleEditClick(i: Sidebar) {
    i.setState({ showEdit: true });
  }

  handleEditCancel() {
    this.setState({ showEdit: false });
  }

  handleShowConfirmLeaveModTeamClick(i: Sidebar) {
    i.setState({ showConfirmLeaveModTeam: true });
  }

  handleCancelLeaveModTeamClick(i: Sidebar) {
    i.setState({ showConfirmLeaveModTeam: false });
  }

  get canPost(): boolean {
    return (
      !this.props.community_view.community.posting_restricted_to_mods ||
      amMod(this.props.moderators) ||
      amAdmin()
    );
  }

  handleModRemoveShow(i: Sidebar) {
    i.setState({ showRemoveDialog: true });
  }

  handleModRemoveReasonChange(i: Sidebar, event: any) {
    i.setState({ removeReason: event.target.value });
  }

  handleModRemoveExpiresChange(i: Sidebar, event: any) {
    i.setState({ removeExpires: event.target.value });
  }

  handlePurgeCommunityShow(i: Sidebar) {
    i.setState({ showPurgeDialog: true, showRemoveDialog: false });
  }

  handlePurgeReasonChange(i: Sidebar, event: any) {
    i.setState({ purgeReason: event.target.value });
  }

  // TODO Do we need two of these?
  handleUnfollowCommunity(i: Sidebar) {
    i.setState({ followCommunityLoading: true });
    i.props.onFollowCommunity({
      community_id: i.props.community_view.community.id,
      follow: false,
      auth: myAuthRequired(),
    });
  }

  handleFollowCommunity(i: Sidebar) {
    i.setState({ followCommunityLoading: true });
    i.props.onFollowCommunity({
      community_id: i.props.community_view.community.id,
      follow: true,
      auth: myAuthRequired(),
    });
  }

  handleBlockCommunity(i: Sidebar) {
    i.setState({ blockCommunityLoading: true });
    i.props.onBlockCommunity({
      community_id: 0,
      block: !i.props.community_view.blocked,
      auth: myAuthRequired(),
    });
  }

  handleLeaveModTeam(i: Sidebar) {
    const myId = UserService.Instance.myUserInfo?.local_user_view.person.id;
    if (myId) {
      i.setState({ leaveModTeamLoading: true });
      i.props.onLeaveModTeam({
        community_id: i.props.community_view.community.id,
        person_id: 92,
        added: false,
        auth: myAuthRequired(),
      });
    }
  }

  handleDeleteCommunity(i: Sidebar) {
    i.setState({ deleteCommunityLoading: true });
    i.props.onDeleteCommunity({
      community_id: i.props.community_view.community.id,
      deleted: !i.props.community_view.community.deleted,
      auth: myAuthRequired(),
    });
  }

  handleRemoveCommunity(i: Sidebar, event: any) {
    event.preventDefault();
    i.setState({ removeCommunityLoading: true });
    i.props.onRemoveCommunity({
      community_id: i.props.community_view.community.id,
      removed: !i.props.community_view.community.removed,
      reason: i.state.removeReason,
      expires: getUnixTime(i.state.removeExpires), // TODO fix this
      auth: myAuthRequired(),
    });
  }

  handlePurgeCommunity(i: Sidebar, event: any) {
    event.preventDefault();
    i.setState({ purgeCommunityLoading: true });
    i.props.onPurgeCommunity({
      community_id: i.props.community_view.community.id,
      reason: i.state.purgeReason,
      auth: myAuthRequired(),
    });
  }
}
