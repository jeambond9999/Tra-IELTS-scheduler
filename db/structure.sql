SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: btree_gist; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA public;


--
-- Name: EXTENSION btree_gist; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION btree_gist IS 'support for indexing common datatypes in GiST';


--
-- Name: prevent_cross_table_teacher_schedule_overlap(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.prevent_cross_table_teacher_schedule_overlap() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(NEW.teacher_id);

  -- Teacher availabilities and lesson sessions are now allowed to overlap.
  RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: ar_internal_metadata; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ar_internal_metadata (
    key character varying NOT NULL,
    value character varying,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL
);


--
-- Name: enrollments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.enrollments (
    id bigint NOT NULL,
    student_id bigint NOT NULL,
    teacher_id bigint NOT NULL,
    sales_id bigint NOT NULL,
    course_name character varying NOT NULL,
    payment_status character varying DEFAULT 'Đã đóng Full'::character varying NOT NULL,
    tuition_note text,
    meet_link character varying NOT NULL,
    start_date date NOT NULL,
    total_sessions integer NOT NULL,
    frequency_per_week integer NOT NULL,
    duration_minutes integer NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL,
    status character varying DEFAULT 'active'::character varying NOT NULL,
    reserved_from date,
    resume_date date,
    reservation_note text,
    pre_reservation_schedule text,
    CONSTRAINT enrollments_duration_check CHECK ((duration_minutes > 0)),
    CONSTRAINT enrollments_frequency_check CHECK ((frequency_per_week = ANY (ARRAY[1, 2]))),
    CONSTRAINT enrollments_total_sessions_positive CHECK ((total_sessions > 0))
);


--
-- Name: enrollments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.enrollments_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: enrollments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.enrollments_id_seq OWNED BY public.enrollments.id;


--
-- Name: items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.items (
    id bigint NOT NULL,
    name character varying NOT NULL,
    description text,
    user_id bigint NOT NULL,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL,
    phone_number character varying,
    discarded_at timestamp(6) without time zone
);


--
-- Name: items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.items_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.items_id_seq OWNED BY public.items.id;


--
-- Name: lesson_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lesson_sessions (
    id bigint NOT NULL,
    enrollment_id bigint NOT NULL,
    teacher_id bigint NOT NULL,
    scheduled_on date NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    duration_minutes integer NOT NULL,
    day_label character varying NOT NULL,
    lesson_status character varying DEFAULT ''::character varying NOT NULL,
    lesson_notes text,
    cs_form character varying DEFAULT ''::character varying NOT NULL,
    cs_status character varying DEFAULT ''::character varying NOT NULL,
    rescheduled_from_id bigint,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL,
    CONSTRAINT lesson_sessions_duration_check CHECK ((duration_minutes > 0))
);


--
-- Name: lesson_sessions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lesson_sessions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: lesson_sessions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lesson_sessions_id_seq OWNED BY public.lesson_sessions.id;


--
-- Name: schema_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.schema_migrations (
    version character varying NOT NULL
);


--
-- Name: students; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.students (
    id bigint NOT NULL,
    name character varying NOT NULL,
    code character varying NOT NULL,
    baseline character varying,
    aim character varying,
    exam_date character varying,
    student_note text,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL,
    exam_status character varying DEFAULT 'chưa thi'::character varying,
    actual_score character varying,
    aim_achieved boolean
);


--
-- Name: students_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.students_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: students_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.students_id_seq OWNED BY public.students.id;


--
-- Name: teacher_availabilities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.teacher_availabilities (
    id bigint NOT NULL,
    teacher_id bigint NOT NULL,
    available_on date NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    duration_minutes integer NOT NULL,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL,
    CONSTRAINT teacher_availabilities_duration_check CHECK ((duration_minutes > 0))
);


--
-- Name: teacher_availabilities_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.teacher_availabilities_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: teacher_availabilities_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.teacher_availabilities_id_seq OWNED BY public.teacher_availabilities.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id bigint NOT NULL,
    email character varying DEFAULT ''::character varying NOT NULL,
    encrypted_password character varying DEFAULT ''::character varying NOT NULL,
    reset_password_token character varying,
    reset_password_sent_at timestamp(6) without time zone,
    remember_created_at timestamp(6) without time zone,
    provider character varying,
    uid character varying,
    name character varying,
    avatar_url character varying,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL,
    roles character varying DEFAULT 'teacher'::character varying NOT NULL,
    active boolean DEFAULT true NOT NULL,
    weekly_availability_target integer,
    CONSTRAINT users_weekly_availability_target_positive CHECK (((weekly_availability_target IS NULL) OR (weekly_availability_target > 0)))
);


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: versions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.versions (
    id bigint NOT NULL,
    whodunnit character varying,
    created_at timestamp(6) without time zone,
    item_id bigint NOT NULL,
    item_type character varying NOT NULL,
    event character varying NOT NULL,
    object text,
    object_changes text
);


--
-- Name: versions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.versions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: versions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.versions_id_seq OWNED BY public.versions.id;


--
-- Name: enrollments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enrollments ALTER COLUMN id SET DEFAULT nextval('public.enrollments_id_seq'::regclass);


--
-- Name: items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.items ALTER COLUMN id SET DEFAULT nextval('public.items_id_seq'::regclass);


--
-- Name: lesson_sessions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lesson_sessions ALTER COLUMN id SET DEFAULT nextval('public.lesson_sessions_id_seq'::regclass);


--
-- Name: students id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.students ALTER COLUMN id SET DEFAULT nextval('public.students_id_seq'::regclass);


--
-- Name: teacher_availabilities id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teacher_availabilities ALTER COLUMN id SET DEFAULT nextval('public.teacher_availabilities_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: versions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.versions ALTER COLUMN id SET DEFAULT nextval('public.versions_id_seq'::regclass);


--
-- Name: ar_internal_metadata ar_internal_metadata_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ar_internal_metadata
    ADD CONSTRAINT ar_internal_metadata_pkey PRIMARY KEY (key);


--
-- Name: enrollments enrollments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enrollments
    ADD CONSTRAINT enrollments_pkey PRIMARY KEY (id);


--
-- Name: items items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.items
    ADD CONSTRAINT items_pkey PRIMARY KEY (id);


--
-- Name: lesson_sessions lesson_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lesson_sessions
    ADD CONSTRAINT lesson_sessions_pkey PRIMARY KEY (id);


--
-- Name: lesson_sessions lesson_sessions_teacher_time_exclusion; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lesson_sessions
    ADD CONSTRAINT lesson_sessions_teacher_time_exclusion EXCLUDE USING gist (teacher_id WITH =, tsrange((scheduled_on + start_time), (scheduled_on + end_time), '[)'::text) WITH &&);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: students students_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_pkey PRIMARY KEY (id);


--
-- Name: teacher_availabilities teacher_availabilities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teacher_availabilities
    ADD CONSTRAINT teacher_availabilities_pkey PRIMARY KEY (id);


--
-- Name: teacher_availabilities teacher_availabilities_teacher_time_exclusion; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teacher_availabilities
    ADD CONSTRAINT teacher_availabilities_teacher_time_exclusion EXCLUDE USING gist (teacher_id WITH =, tsrange((available_on + start_time), (available_on + end_time), '[)'::text) WITH &&);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: versions versions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.versions
    ADD CONSTRAINT versions_pkey PRIMARY KEY (id);


--
-- Name: index_availability_on_teacher_date_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_availability_on_teacher_date_time ON public.teacher_availabilities USING btree (teacher_id, available_on, start_time, end_time);


--
-- Name: index_enrollments_on_sales_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_enrollments_on_sales_id ON public.enrollments USING btree (sales_id);


--
-- Name: index_enrollments_on_student_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_enrollments_on_student_id ON public.enrollments USING btree (student_id);


--
-- Name: index_enrollments_on_teacher_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_enrollments_on_teacher_id ON public.enrollments USING btree (teacher_id);


--
-- Name: index_items_on_discarded_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_items_on_discarded_at ON public.items USING btree (discarded_at);


--
-- Name: index_items_on_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_items_on_user_id ON public.items USING btree (user_id);


--
-- Name: index_lesson_sessions_on_enrollment_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_lesson_sessions_on_enrollment_id ON public.lesson_sessions USING btree (enrollment_id);


--
-- Name: index_lesson_sessions_on_rescheduled_from_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_lesson_sessions_on_rescheduled_from_id ON public.lesson_sessions USING btree (rescheduled_from_id);


--
-- Name: index_lesson_sessions_on_teacher_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_lesson_sessions_on_teacher_id ON public.lesson_sessions USING btree (teacher_id);


--
-- Name: index_lessons_on_teacher_date_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_lessons_on_teacher_date_time ON public.lesson_sessions USING btree (teacher_id, scheduled_on, start_time, end_time);


--
-- Name: index_students_on_code; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX index_students_on_code ON public.students USING btree (code);


--
-- Name: index_teacher_availabilities_on_teacher_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_teacher_availabilities_on_teacher_id ON public.teacher_availabilities USING btree (teacher_id);


--
-- Name: index_users_on_email; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX index_users_on_email ON public.users USING btree (email);


--
-- Name: index_users_on_provider_and_uid; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX index_users_on_provider_and_uid ON public.users USING btree (provider, uid);


--
-- Name: index_users_on_reset_password_token; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX index_users_on_reset_password_token ON public.users USING btree (reset_password_token);


--
-- Name: index_versions_on_item_type_and_item_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_versions_on_item_type_and_item_id ON public.versions USING btree (item_type, item_id);


--
-- Name: lesson_sessions lesson_sessions_prevent_cross_table_overlap; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER lesson_sessions_prevent_cross_table_overlap BEFORE INSERT OR UPDATE OF teacher_id, scheduled_on, start_time, end_time ON public.lesson_sessions FOR EACH ROW EXECUTE FUNCTION public.prevent_cross_table_teacher_schedule_overlap();


--
-- Name: lesson_sessions fk_rails_20d3e4bded; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lesson_sessions
    ADD CONSTRAINT fk_rails_20d3e4bded FOREIGN KEY (rescheduled_from_id) REFERENCES public.lesson_sessions(id);


--
-- Name: teacher_availabilities fk_rails_27c6539657; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teacher_availabilities
    ADD CONSTRAINT fk_rails_27c6539657 FOREIGN KEY (teacher_id) REFERENCES public.users(id);


--
-- Name: lesson_sessions fk_rails_4cd73fb6c8; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lesson_sessions
    ADD CONSTRAINT fk_rails_4cd73fb6c8 FOREIGN KEY (enrollment_id) REFERENCES public.enrollments(id);


--
-- Name: lesson_sessions fk_rails_98366d7484; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lesson_sessions
    ADD CONSTRAINT fk_rails_98366d7484 FOREIGN KEY (teacher_id) REFERENCES public.users(id);


--
-- Name: items fk_rails_d4b6334db2; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.items
    ADD CONSTRAINT fk_rails_d4b6334db2 FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: enrollments fk_rails_d7ecead031; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enrollments
    ADD CONSTRAINT fk_rails_d7ecead031 FOREIGN KEY (sales_id) REFERENCES public.users(id);


--
-- Name: enrollments fk_rails_e62a7e8f83; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enrollments
    ADD CONSTRAINT fk_rails_e62a7e8f83 FOREIGN KEY (teacher_id) REFERENCES public.users(id);


--
-- Name: enrollments fk_rails_f01c555e06; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enrollments
    ADD CONSTRAINT fk_rails_f01c555e06 FOREIGN KEY (student_id) REFERENCES public.students(id);


--
-- PostgreSQL database dump complete
--

SET search_path TO "$user", public;

INSERT INTO "schema_migrations" (version) VALUES
('20260916180000'),
('20260914223000'),
('20260906114500'),
('20260906104000'),
('20260906103500'),
('20260904230000'),
('20260824195000'),
('20260823183500'),
('20260823094800'),
('20260823083000'),
('20260810030000'),
('20260810020000'),
('20260810010000'),
('20260117054635'),
('20260117053345'),
('20260117053342'),
('20260116190405'),
('20260116183905'),
('20260116182239');

